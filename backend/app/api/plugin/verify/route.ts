import dayjs from "dayjs";

import {
  assertEmailConfirmedForUser,
  EmailNotConfirmedError,
} from "@/lib/auth/email-confirmed";
import { verifyPluginTokenFromHeader } from "@/lib/plugin-tokens/verify";
import { enforceVerifyRateLimit } from "@/lib/rate-limit";

// Purpose: lightweight plugin token check before the Figma plugin stores credentials.
// Context: classify does full work; this route only verifies Bearer + email confirmed.
// Intent: lets the plugin gate screen fail fast without fetching comments or calling AI.
export const maxDuration = 10;

const base_cors_headers = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  Vary: "Origin",
};

const default_allowed_origins = [
  "http://localhost:3000",
  "https://figcomment.vercel.app",
  "https://www.figma.com",
  "https://figma.com",
  "null",
];

class VerifyHttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "VerifyHttpError";
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

// Flow: 1) origin check, 2) Bearer verify, 3) email confirmed, 4) return prefix metadata.
export async function POST(request: Request): Promise<Response> {
  const start_time = dayjs().valueOf();
  const request_origin = request.headers.get("origin") ?? "";

  console.log("[verifyPluginToken] started", { request_origin });

  try {
    if (!is_origin_allowed(request_origin)) {
      console.error("[verifyPluginToken] forbidden_origin", { request_origin });
      return json_error({
        request_origin,
        status: 403,
        code: "forbidden_origin",
        message: "Request origin is not allowed.",
        start_time,
      });
    }

    const authorization = request.headers.get("authorization");
    const verified = await verifyPluginTokenFromHeader(authorization);

    if (!verified) {
      console.error("[verifyPluginToken] unauthorized");
      throw new VerifyHttpError(
        401,
        "unauthorized",
        "Missing or invalid plugin token. Paste your token from your web profile.",
      );
    }

    const rate_limit_result = enforceVerifyRateLimit(request, verified.token_id);
    if (!rate_limit_result.allowed) {
      console.error("[verifyPluginToken] rate_limited", {
        token_id: verified.token_id,
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

    await assertEmailConfirmedForUser(verified.user_id);

    console.log("[verifyPluginToken] completed", {
      user_id: verified.user_id,
      token_prefix: verified.prefix,
    });

    return Response.json(
      {
        ok: true,
        prefix: verified.prefix,
        meta: {
          latency_ms: dayjs().diff(start_time),
        },
      },
      {
        headers: create_cors_headers(request_origin),
      },
    );
  } catch (error: unknown) {
    if (error instanceof VerifyHttpError) {
      console.error("[verifyPluginToken] verify_http_error", {
        code: error.code,
        status: error.status,
      });
      return json_error({
        request_origin,
        status: error.status,
        code: error.code,
        message: error.message,
        start_time,
      });
    }

    if (error instanceof EmailNotConfirmedError) {
      console.error("[verifyPluginToken] email_not_confirmed");
      return json_error({
        request_origin,
        status: 403,
        code: error.code,
        message: error.message,
        start_time,
      });
    }

    const message =
      error instanceof Error ? error.message : "Unexpected verify error";

    console.error("[verifyPluginToken] unexpected_error", { message });

    return json_error({
      request_origin,
      status: 400,
      code: "bad_request",
      message,
      start_time,
    });
  }
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
      : (allowed_origins[0] ?? "*");

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
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

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
