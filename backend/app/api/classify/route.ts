import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { mock_rows_for_comments } from "../../../lib/classify/mock";
import { classifier_system_prompt } from "../../../lib/classify/prompt";
import {
  classify_mode_schema,
  classify_request_schema,
  classify_response_schema,
  type ClassifiedRow,
} from "../../../lib/classify/schema";

// Purpose: classify Figma file comments into the plugin's table-friendly schema.
// Context: this route is the backend contract used by the Figma plugin demo.
// Intent: keep the demo deterministic while still supporting live AI classification.
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const runtime = "nodejs";

const base_cors_headers = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  Vary: "Origin",
};

const default_allowed_origins = [
  "http://localhost:3000",
  "https://figcomment.vercel.app",
  "https://www.figma.com",
  "https://figma.com",
  "null",
];

type RateLimitEntry = {
  count: number;
  window_started_at_ms: number;
};

const rate_limit_store = new Map<string, RateLimitEntry>();

type FigmaComment = {
  message: string;
  user?: {
    handle?: string;
    name?: string;
  };
};

type FigmaCommentsResponse = {
  comments: FigmaComment[];
};

type FlattenedComment = {
  person: string;
  feedback: string;
};

// Preflight support for plugin requests from Figma/browser contexts.
export async function OPTIONS(request: Request): Promise<Response> {
  const request_origin = request.headers.get("origin") ?? "";
  return new Response(null, {
    status: 204,
    headers: create_cors_headers(request_origin),
  });
}

// Server action flow:
// 1) validate origin and rate limit, 2) validate body, 3) fetch comments,
// 4) classify them, 5) return a strict response contract.
export async function POST(request: Request): Promise<Response> {
  const start_time = Date.now();
  try {
    // Step 1: reject disallowed origins before doing any external calls.
    const request_origin = request.headers.get("origin") ?? "";
    if (!is_origin_allowed(request_origin)) {
      return json_error({
        request_origin,
        status: 403,
        code: "forbidden_origin",
        message: "Request origin is not allowed.",
        start_time,
      });
    }

    // Step 2: guard demo endpoint from burst traffic.
    const rate_limit_result = enforce_rate_limit(request);
    if (!rate_limit_result.allowed) {
      const retry_after_seconds = Math.max(
        1,
        Math.ceil(rate_limit_result.retry_after_ms / 1000),
      );

      return json_error({
        request_origin,
        status: 429,
        code: "rate_limited",
        message: "Too many requests. Try again shortly.",
        start_time,
        extra_headers: {
          "Retry-After": String(retry_after_seconds),
        },
      });
    }

    // Step 3: parse the request and lock into our schema contract.
    const request_json: unknown = await request.json();
    const request_payload = classify_request_schema.parse(request_json);

    const mode = get_mode();
    console.log("[classifyComments] started", {
      mode,
      file_key: request_payload.file_key,
    });

    // Step 4: load source comments from Figma (or seeded comments in mock mode).
    const comments = await fetch_figma_comments(request_payload.file_key, mode);
    if (comments.length === 0) {
      throw new Error("No comments found in this Figma file.");
    }

    // Step 5: choose deterministic mock or live AI classification path.
    const rows =
      mode === "mock"
        ? mock_rows_for_comments(comments)
        : await classify_with_ai(comments, mode);

    // Step 6: enforce response schema before sending to plugin renderer.
    const response_payload = classify_response_schema.parse({
      rows,
      meta: {
        mode,
        latency_ms: Date.now() - start_time,
      },
    });

    console.log("[classifyComments] completed", {
      mode,
      comment_count: comments.length,
      row_count: response_payload.rows.length,
      latency_ms: response_payload.meta.latency_ms,
    });

    return Response.json(response_payload, {
      status: 200,
      headers: create_cors_headers(request_origin),
    });
  } catch (error: unknown) {
    console.error("[classifyComments] error", error);
    const message =
      error instanceof Error ? error.message : "Unexpected classify error";
    const request_origin = request.headers.get("origin") ?? "";
    return json_error({
      request_origin,
      status: 400,
      code: "bad_request",
      message,
      start_time,
    });
  }
}

// Pulls comments from Figma and normalizes them into a small classification input model.
async function fetch_figma_comments(
  file_key: string,
  mode: z.infer<typeof classify_mode_schema>,
): Promise<FlattenedComment[]> {
  const figma_token = process.env.FIGMA_TOKEN;
  if (!figma_token) {
    if (mode === "mock") {
      return create_mock_input();
    }

    throw new Error("Missing FIGMA_TOKEN environment variable.");
  }

  // no-store ensures demo users always see latest comment state.
  const figma_response = await fetch(
    `https://api.figma.com/v1/files/${encodeURIComponent(file_key)}/comments`,
    {
      headers: {
        "X-FIGMA-TOKEN": figma_token,
      },
      cache: "no-store",
    },
  );

  if (!figma_response.ok) {
    const body_text = await figma_response.text();
    throw new Error(
      `Failed to fetch Figma comments (${figma_response.status}): ${body_text}`,
    );
  }

  const response_json: unknown = await figma_response.json();
  const parsed_response = response_json as FigmaCommentsResponse;
  if (!Array.isArray(parsed_response.comments)) {
    throw new Error("Figma comments API returned invalid payload.");
  }

  // Normalize unknown API shape into deterministic person/feedback pairs.
  return parsed_response.comments
    .filter((comment) => typeof comment.message === "string" && comment.message.length > 0)
    .map((comment) => ({
      person: comment.user?.name || comment.user?.handle || "Unknown",
      feedback: comment.message.trim(),
    }));
}

// Performs one AI classification call and validates output structure before returning it.
async function classify_with_ai(
  comments: FlattenedComment[],
  mode: z.infer<typeof classify_mode_schema>,
): Promise<ClassifiedRow[]> {
  const anthropic_key = process.env.AI_PROVIDER_KEY || process.env.ANTHROPIC_API_KEY;
  if (!anthropic_key) {
    if (mode === "fallback") {
      return mock_rows_for_comments(comments);
    }
    throw new Error("Missing AI_PROVIDER_KEY or ANTHROPIC_API_KEY.");
  }

  const anthropic = new Anthropic({ apiKey: anthropic_key });
  const model_name = process.env.AI_MODEL ?? "claude-sonnet-4-6";

  try {
    const ai_response = await anthropic.messages.create({
      model: model_name,
      max_tokens: 2048,
      system: classifier_system_prompt,
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            comments,
            instruction:
              "Classify each comment and output strictly valid JSON matching the requested schema.",
          }),
        },
      ],
    });

    const ai_text = ai_response.content
      .filter((item) => item.type === "text")
      .map((item) => item.text)
      .join("\n");

    const json_text = extract_json_payload(ai_text);
    const parsed_json: unknown = JSON.parse(json_text);
    const parsed_rows = z
      .object({ rows: z.array(classify_response_schema.shape.rows.element) })
      .parse(parsed_json);

    return parsed_rows.rows;
  } catch (error: unknown) {
    console.error("[classifyComments] classify_with_ai_error", error);
    if (mode === "fallback") {
      return mock_rows_for_comments(comments);
    }
    throw new Error("AI classification failed.");
  }
}

// Parses and validates runtime mode to avoid silent env typos.
function get_mode(): z.infer<typeof classify_mode_schema> {
  const env_mode = process.env.DEMO_MODE ?? "fallback";
  return classify_mode_schema.parse(env_mode);
}

// Extract JSON from plain text or fenced markdown responses.
function extract_json_payload(ai_text: string): string {
  const trimmed = ai_text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const code_fence_match = trimmed.match(/```json\s*([\s\S]*?)```/i);
  if (code_fence_match && code_fence_match[1]) {
    return code_fence_match[1].trim();
  }

  const first_brace = trimmed.indexOf("{");
  const last_brace = trimmed.lastIndexOf("}");
  if (first_brace >= 0 && last_brace > first_brace) {
    return trimmed.slice(first_brace, last_brace + 1);
  }

  throw new Error("AI returned non-JSON content.");
}

// Deterministic fallback input used when mock mode runs without Figma credentials.
function create_mock_input(): FlattenedComment[] {
  return [
    {
      person: "Priya",
      feedback:
        "The notification card feels cramped on mobile, especially with three action buttons stacked vertically",
    },
    {
      person: "Marcus",
      feedback: "Can we add a way to snooze a notification instead of only dismissing it?",
    },
    {
      person: "Elena",
      feedback: "Move the Jira issue key to the top of the card so it's the first thing people see",
    },
    {
      person: "Devon",
      feedback:
        'Not clear what "Sync" actually does here - is it pulling new comments or pushing our reply back to Jira?',
    },
    {
      person: "Priya",
      feedback:
        "What if clicking the assignee's avatar opened a quick preview of their other open tickets?",
    },
    {
      person: "Sam",
      feedback:
        'Color contrast on the "Resolved" tag fails WCAG AA against this background - worth checking the palette',
    },
    {
      person: "Marcus",
      feedback:
        "Add an unread state so people can tell which threads they haven't looked at yet",
    },
    {
      person: "Elena",
      feedback:
        "For teams with high ticket volume this could get noisy fast - maybe batch notifications per project?",
    },
    {
      person: "Devon",
      feedback:
        "Would be great to react with emoji directly on the Jira comment from inside Slack",
    },
    {
      person: "Sam",
      feedback:
        'Button labels are inconsistent - "View Issue" vs "Open Ticket," pick one and standardize',
    },
  ];
}

// Check if request origin is allowed by explicit configuration/defaults.
function is_origin_allowed(origin: string): boolean {
  if (!origin) {
    // Non-browser/plugin runtime requests may omit Origin.
    return true;
  }

  const allowed_origins = get_allowed_origins();
  if (allowed_origins.includes("*")) {
    return true;
  }

  return allowed_origins.includes(origin);
}

// Build CORS headers with explicit origin echoing when allowlist mode is active.
function create_cors_headers(origin: string): Record<string, string> {
  const allowed_origins = get_allowed_origins();
  const allow_any = allowed_origins.includes("*");
  const allowed_origin_value = allow_any
    ? "*"
    : is_origin_allowed(origin) && origin
      ? origin
      : allowed_origins[0] ?? "*";

  return {
    ...base_cors_headers,
    "Access-Control-Allow-Origin": allowed_origin_value,
  };
}

// Parse allowed origins from env with safe defaults for local and Figma contexts.
function get_allowed_origins(): string[] {
  const configured = process.env.CORS_ALLOWED_ORIGINS;
  if (!configured || configured.trim().length === 0) {
    return default_allowed_origins;
  }

  const parsed = configured
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  return parsed.length > 0 ? parsed : default_allowed_origins;
}

// Lightweight in-memory limiter to keep demo endpoint responsive.
function enforce_rate_limit(request: Request): {
  allowed: boolean;
  retry_after_ms: number;
} {
  const window_ms = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
  const max_requests = Number(process.env.RATE_LIMIT_MAX ?? 30);
  const identifier = get_client_identifier(request);
  const now = Date.now();

  const entry = rate_limit_store.get(identifier);
  if (!entry || now - entry.window_started_at_ms > window_ms) {
    rate_limit_store.set(identifier, { count: 1, window_started_at_ms: now });
    return { allowed: true, retry_after_ms: 0 };
  }

  if (entry.count >= max_requests) {
    return {
      allowed: false,
      retry_after_ms: window_ms - (now - entry.window_started_at_ms),
    };
  }

  entry.count += 1;
  rate_limit_store.set(identifier, entry);
  return { allowed: true, retry_after_ms: 0 };
}

// Build a stable rate-limit key from proxy headers with graceful fallback.
function get_client_identifier(request: Request): string {
  const forwarded_for = request.headers.get("x-forwarded-for");
  if (forwarded_for) {
    const first_ip = forwarded_for.split(",")[0]?.trim();
    if (first_ip) {
      return `ip:${first_ip}`;
    }
  }

  const cf_ip = request.headers.get("cf-connecting-ip");
  if (cf_ip) {
    return `ip:${cf_ip}`;
  }

  const origin = request.headers.get("origin");
  if (origin) {
    return `origin:${origin}`;
  }

  return "unknown";
}

// Return a consistent error envelope for plugin-side handling and debug visibility.
function json_error(args: {
  request_origin: string;
  status: number;
  code: string;
  message: string;
  start_time: number;
  extra_headers?: Record<string, string>;
}): Response {
  const payload = {
    ok: false,
    error: {
      code: args.code,
      message: args.message,
    },
    meta: {
      latency_ms: Date.now() - args.start_time,
    },
  };

  return Response.json(payload, {
    status: args.status,
    headers: {
      ...create_cors_headers(args.request_origin),
      ...(args.extra_headers ?? {}),
    },
  });
}
