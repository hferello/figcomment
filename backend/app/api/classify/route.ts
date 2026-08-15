import dayjs from "dayjs";
import { generateText, Output } from "ai";
import { z } from "zod";
import {
  assertEmailConfirmedForUser,
  EmailNotConfirmedError,
} from "@/lib/auth/email-confirmed";
import { mock_rows_for_comments } from "@/lib/classify/mock";
import {
  detokenizeClassifiedRows,
  redactCommentsForPrompt,
  type FlattenedComment,
} from "@/lib/classify/pii-redact";
import { classifier_system_prompt } from "@/lib/classify/prompt";
import {
  classify_mode_schema,
  classify_request_schema,
  classify_response_schema,
  classified_row_schema,
  type ClassifiedRow,
  type ClassifyMode,
} from "@/lib/classify/schema";
import { classifyHeuristically } from "@/lib/classify/heuristic";
import {
  ai_response_schema,
  attachPromptIds,
  mergeRowsWithExactIdSet,
} from "@/lib/classify/merge-classifications";
import {
  enforceCommentCountLimit,
  MAX_AI_BATCHES,
  MAX_COMMENTS_PER_REQUEST,
  splitIntoBatches,
  truncateCommentsForClassification,
} from "@/lib/classify/limits";
import {
  buildModelForProvider,
  resolveProvider,
} from "@/lib/classify/provider-dispatch";
import {
  isProviderCredentialError,
  isProviderRateLimitError,
  isProviderUnavailableError,
} from "@/lib/classify/provider-errors";
import { app_constants } from "@/data/constants";
import {
  touchPluginTokenLastUsed,
  verifyPluginTokenFromHeader,
  type VerifiedPluginToken,
} from "@/lib/plugin-tokens/verify";
import { enforceClassifyRateLimit } from "@/lib/rate-limit";
import {
  InvalidProviderCredentialsError,
  loadUserSecretsForClassify,
  MissingProviderCredentialsError,
  type UserProviderCredentials,
} from "@/lib/user-secrets/load-for-classify";

// Purpose: classify Figma file comments into the plugin's table-friendly schema.
// Context: authenticated plugin requests use per-user Figma + Anthropic credentials.
// Intent: ephemeral processing only — never persist comments or PII to Supabase.
// Note: with cacheComponents, `dynamic`/`runtime` segment configs are disabled —
// POST handlers are request-time by default under the Node.js runtime.
export const maxDuration = 60;

const base_cors_headers = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  Vary: "Origin",
};

const default_allowed_origins = [
  app_constants.backend.site_local,
  app_constants.backend.site_production,
  app_constants.backend.legacy_site_production,
  ...app_constants.backend.figma_origins,
  app_constants.backend.null_origin,
];

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

type ClassifyAuthContext = {
  verified: VerifiedPluginToken;
};

class ClassifyHttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ClassifyHttpError";
    this.status = status;
    this.code = code;
  }
}

// Preflight support for plugin requests from Figma/browser contexts.
export async function OPTIONS(request: Request): Promise<Response> {
  const request_origin = request.headers.get("origin") ?? "";
  return new Response(null, {
    status: 204,
    headers: create_cors_headers(request_origin),
  });
}

// Flow:
// 1) validate origin, 2) auth (or dev mock bypass), 3) rate limit,
// 4) validate body, 5) fetch comments, 6) classify, 7) touch last_used_at, 8) return rows.
export async function POST(request: Request): Promise<Response> {
  const start_time = dayjs().valueOf();
  const request_origin = request.headers.get("origin") ?? "";

  console.log("[classifyComments] started", { request_origin });

  try {
    // Step 1: reject disallowed origins before auth or external calls.
    if (!is_origin_allowed(request_origin)) {
      console.error("[classifyComments] forbidden_origin", { request_origin });
      return json_error({
        request_origin,
        status: 403,
        code: "forbidden_origin",
        message: "Request origin is not allowed.",
        start_time,
      });
    }

    const mode = get_mode();
    const demo_bypass = is_unauthenticated_demo_allowed(mode);
    let auth_context: ClassifyAuthContext | null = null;

    // Step 2: Bearer token verification (skipped in local mock bypass).
    if (!demo_bypass) {
      auth_context = await resolve_authenticated_context(request);
    }

    // Step 3: per-token rate limit when authenticated; IP fallback for dev bypass.
    const rate_limit_result = enforceClassifyRateLimit(
      request,
      auth_context?.verified.token_id,
    );
    if (!rate_limit_result.allowed) {
      console.error("[classifyComments] rate_limited", {
        token_id: auth_context?.verified.token_id,
      });
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

    // Step 4: parse and validate request body contract before decrypting any LLM key.
    const request_json: unknown = await request.json();
    const request_payload = classify_request_schema.parse(request_json);

    let credentials: UserProviderCredentials | null = null;
    if (auth_context) {
      credentials = await loadUserSecretsForClassify(
        auth_context.verified.user_id,
        request_payload,
      );
    }

    console.log("[classifyComments] processing", {
      mode,
      file_key: request_payload.file_key,
      user_id: auth_context?.verified.user_id,
      token_prefix: auth_context?.verified.prefix,
      demo_bypass,
    });

    // Step 5: load comments from Figma (user PAT) or seeded mock input.
    const comments = await fetch_figma_comments(
      request_payload.file_key,
      mode,
      credentials,
      demo_bypass,
    );

    if (comments.length === 0) {
      throw new ClassifyHttpError(
        400,
        "no_comments",
        "No comments found in this Figma file.",
      );
    }

    // Step 6: cap + classify.
    if (mode !== "mock") {
      try {
        enforceCommentCountLimit(comments);
      } catch {
        throw new ClassifyHttpError(
          400,
          "too_many_comments",
          `${app_constants.backend.title} supports up to ${MAX_COMMENTS_PER_REQUEST} comments per run.`,
        );
      }
    }

    const truncated_comments = truncateCommentsForClassification(comments);
    const rows =
      mode === "mock"
        ? mock_rows_for_comments(truncated_comments)
        : request_payload.sort_method === "heuristic"
          ? classifyHeuristically(truncated_comments)
          : await classify_with_ai(truncated_comments, mode, credentials);

    const response_payload = classify_response_schema.parse({
      rows,
      meta: {
        mode,
        sort_method: request_payload.sort_method,
        provider:
          request_payload.sort_method === "ai"
            ? resolveProvider(credentials?.llm_provider ?? null)
            : null,
        latency_ms: dayjs().diff(start_time),
      },
    });

    // Step 7: record token usage via service_role (privileged lifecycle column).
    if (auth_context) {
      await touchPluginTokenLastUsed(auth_context.verified.token_id);
    }

    // Step 8: return strict response schema to plugin renderer.

    console.log("[classifyComments] completed", {
      mode,
      user_id: auth_context?.verified.user_id,
      token_prefix: auth_context?.verified.prefix,
      comment_count: comments.length,
      row_count: response_payload.rows.length,
      latency_ms: response_payload.meta.latency_ms,
    });

    return Response.json(response_payload, {
      status: 200,
      headers: create_cors_headers(request_origin),
    });
  } catch (error: unknown) {
    console.error("[classifyComments] error", {
      name: error instanceof Error ? error.name : "unknown",
      code: error instanceof ClassifyHttpError ? error.code : undefined,
    });

    if (error instanceof ClassifyHttpError) {
      return json_error({
        request_origin,
        status: error.status,
        code: error.code,
        message: error.message,
        start_time,
      });
    }

    if (error instanceof EmailNotConfirmedError) {
      return json_error({
        request_origin,
        status: 403,
        code: error.code,
        message: error.message,
        start_time,
      });
    }

    if (error instanceof MissingProviderCredentialsError) {
      return json_error({
        request_origin,
        status: 400,
        code: error.code,
        message: error.message,
        start_time,
      });
    }

    if (error instanceof InvalidProviderCredentialsError) {
      return json_error({
        request_origin,
        status: 400,
        code: error.code,
        message: error.message,
        start_time,
      });
    }

    if (error instanceof z.ZodError) {
      return json_error({
        request_origin,
        status: 400,
        code: "bad_request",
        message: error.issues[0]?.message ?? "Invalid request body.",
        start_time,
      });
    }

    const message =
      error instanceof Error ? error.message : "Unexpected classify error";

    return json_error({
      request_origin,
      status: 400,
      code: "bad_request",
      message,
      start_time,
    });
  }
}

async function resolve_authenticated_context(
  request: Request,
): Promise<ClassifyAuthContext> {
  console.log("[resolve_authenticated_context] started");

  const authorization = request.headers.get("authorization");
  const verified = await verifyPluginTokenFromHeader(authorization);

  if (!verified) {
    console.error("[resolve_authenticated_context] unauthorized");
    throw new ClassifyHttpError(
      401,
      "unauthorized",
      "Missing or invalid plugin token. Add Authorization: Bearer fc_… from your profile.",
    );
  }

  await assertEmailConfirmedForUser(verified.user_id);

  console.log("[resolve_authenticated_context] completed", {
    user_id: verified.user_id,
    token_prefix: verified.prefix,
  });

  return { verified };
}

/**
 * Local dev only: DEMO_MODE=mock skips Bearer auth and uses seeded comments.
 */
function is_unauthenticated_demo_allowed(mode: ClassifyMode): boolean {
  return mode === "mock" && process.env.NODE_ENV === "development";
}

async function fetch_figma_comments(
  file_key: string,
  mode: ClassifyMode,
  credentials: UserProviderCredentials | null,
  demo_bypass: boolean,
): Promise<FlattenedComment[]> {
  console.log("[fetch_figma_comments] started", { file_key, mode, demo_bypass });

  if (mode === "mock" || demo_bypass) {
    console.log("[fetch_figma_comments] completed", { source: "mock_input" });
    return create_mock_input();
  }

  if (!credentials?.figma_token) {
    console.error("[fetch_figma_comments] missing_figma_token");
    throw new ClassifyHttpError(
      400,
      "missing_figma_token",
      "Save your Figma personal access token in your profile before running analysis.",
    );
  }

  const figma_response = await fetch(
    `https://api.figma.com/v1/files/${encodeURIComponent(file_key)}/comments`,
    {
      headers: {
        "X-FIGMA-TOKEN": credentials.figma_token,
      },
      // no-store: always classify latest comment state; never cache PII in CDN.
      cache: "no-store",
    },
  );

  if (!figma_response.ok) {
    const status = figma_response.status;

    if (status === 401 || status === 403) {
      console.error("[fetch_figma_comments] invalid_figma_token", { status });
      throw new ClassifyHttpError(
        400,
        "invalid_figma_token",
        "Figma rejected your token. Check your personal access token in your profile.",
      );
    }

    throw new ClassifyHttpError(
      400,
      "figma_fetch_failed",
      `Failed to fetch Figma comments (${status}).`,
    );
  }

  const response_json: unknown = await figma_response.json();
  const parsed_response = response_json as FigmaCommentsResponse;
  if (!Array.isArray(parsed_response.comments)) {
    console.error("[fetch_figma_comments] invalid_payload");
    throw new ClassifyHttpError(
      400,
      "figma_fetch_failed",
      "Figma comments API returned invalid payload.",
    );
  }

  const flattened = parsed_response.comments
    .filter((comment) => typeof comment.message === "string" && comment.message.length > 0)
    .map((comment) => ({
      person: comment.user?.name || comment.user?.handle || "Unknown",
      feedback: comment.message.trim(),
    }));

  console.log("[fetch_figma_comments] completed", { comment_count: flattened.length });
  return flattened;
}

async function classify_with_ai(
  comments: FlattenedComment[],
  mode: ClassifyMode,
  credentials: UserProviderCredentials | null,
): Promise<ClassifiedRow[]> {
  console.log("[classify_with_ai] started", { mode, comment_count: comments.length });

  if (!credentials?.llm_key) {
    console.error("[classify_with_ai] missing_llm_key");
    throw new ClassifyHttpError(
      400,
      "missing_llm_key",
      "Save a model API key in your profile before using AI sort.",
    );
  }

  const provider = resolveProvider(credentials.llm_provider);
  const batches =
    comments.length > 18
      ? splitIntoBatches(comments, MAX_AI_BATCHES)
      : [comments];
  const final_rows: ClassifiedRow[] = [];

  try {
    for (const batch of batches) {
      const prompt_rows = attachPromptIds(batch);
      const { redacted, token_map } = redactCommentsForPrompt(
        prompt_rows.map((row) => ({
          person: row.person,
          feedback: row.feedback,
        })),
      );

      const redacted_with_ids = prompt_rows.map((row, index) => ({
        id: row.id,
        person: redacted[index]?.person ?? row.person,
        feedback: redacted[index]?.feedback ?? row.feedback,
      }));

      const model = buildModelForProvider(provider, credentials.llm_key);
      const result = await generateText({
        model,
        system: classifier_system_prompt,
        prompt: JSON.stringify({
          instruction:
            "Return exactly one row per input id. Preserve the id and return strictly valid JSON.",
          comments: redacted_with_ids,
        }),
        maxOutputTokens: 8192,
        output: Output.object({
          schema: ai_response_schema,
        }),
      });

      const ai_payload = ai_response_schema.parse(result.output);
      const merged_rows = mergeRowsWithExactIdSet(prompt_rows, ai_payload.rows);
      const restored_rows = detokenizeClassifiedRows(merged_rows, token_map);
      final_rows.push(...restored_rows);
    }

    console.log("[classify_with_ai] completed", { row_count: final_rows.length });
    return z.array(classified_row_schema).parse(final_rows);
  } catch (error: unknown) {
    console.error("[classify_with_ai] failed", {
      mode,
      error_name: error instanceof Error ? error.name : "unknown",
      provider,
    });

    if (isProviderCredentialError(error)) {
      throw new ClassifyHttpError(
        400,
        "invalid_credentials",
        "The selected provider rejected your key. Save a valid key and try again.",
      );
    }

    if (isProviderRateLimitError(error)) {
      throw new ClassifyHttpError(
        429,
        "provider_rate_limited",
        "The selected AI provider is rate limiting this request. Try again shortly.",
      );
    }

    if (isProviderUnavailableError(error)) {
      throw new ClassifyHttpError(
        503,
        "provider_unavailable",
        "The selected AI provider is currently unavailable. Try again shortly.",
      );
    }

    if (mode === "fallback" && process.env.NODE_ENV === "development") {
      console.log("[classify_with_ai] fallback_to_mock", { mode });
      return mock_rows_for_comments(comments);
    }

    throw new ClassifyHttpError(
      502,
      "classification_failed",
      "AI classification failed. Try again or switch to keyword sort.",
    );
  }
}

function get_mode(): ClassifyMode {
  const env_mode = process.env.DEMO_MODE ?? "fallback";
  return classify_mode_schema.parse(env_mode);
}

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

function is_origin_allowed(origin: string): boolean {
  if (!origin) {
    return true;
  }

  const allowed_origins = get_allowed_origins();
  if (allowed_origins.includes("*")) {
    return true;
  }

  return allowed_origins.includes(origin);
}

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
      latency_ms: dayjs().diff(args.start_time),
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
