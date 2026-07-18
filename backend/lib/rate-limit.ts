/**
 * In-memory sliding-window rate limits for API routes.
 * Intent: enforce per-IP and per-plugin-token buckets independently.
 */

import dayjs from "dayjs";

type RateLimitEntry = {
  count: number;
  window_started_at_ms: number;
};

type RateLimitStore = Map<string, RateLimitEntry>;

export type RateLimitResult = {
  allowed: boolean;
  retry_after_ms: number;
};

export type RateLimitOptions = {
  window_ms?: number;
  max_requests?: number;
  /** Override env defaults for lighter endpoints (e.g. verify). */
  env_window_key?: string;
  env_max_key?: string;
};

// Module-level stores — acceptable for v1 single-instance; revisit for multi-region.
const classify_rate_limit_store: RateLimitStore = new Map();
const verify_rate_limit_store: RateLimitStore = new Map();

/**
 * Resolve client IP from common proxy headers.
 */
export function getClientIp(request: Request): string | null {
  const forwarded_for = request.headers.get("x-forwarded-for");
  if (forwarded_for) {
    const first_ip = forwarded_for.split(",")[0]?.trim();
    if (first_ip) {
      return first_ip;
    }
  }

  const cf_ip = request.headers.get("cf-connecting-ip");
  if (cf_ip) {
    return cf_ip.trim();
  }

  return null;
}

function getBucketKey(kind: "ip" | "token", value: string): string {
  return `${kind}:${value}`;
}

function checkSingleBucket(
  store: RateLimitStore,
  bucket_key: string,
  window_ms: number,
  max_requests: number,
): RateLimitResult {
  const now = dayjs().valueOf();
  const entry = store.get(bucket_key);

  if (!entry || now - entry.window_started_at_ms > window_ms) {
    store.set(bucket_key, { count: 1, window_started_at_ms: now });
    return { allowed: true, retry_after_ms: 0 };
  }

  if (entry.count >= max_requests) {
    return {
      allowed: false,
      retry_after_ms: window_ms - (now - entry.window_started_at_ms),
    };
  }

  entry.count += 1;
  store.set(bucket_key, entry);
  return { allowed: true, retry_after_ms: 0 };
}

/**
 * Evaluate IP bucket always; token bucket when token_id is present.
 * Deny when either bucket is exceeded.
 */
export function enforceDualRateLimit(
  request: Request,
  store: RateLimitStore,
  token_id: string | undefined,
  options: RateLimitOptions = {},
): RateLimitResult {
  const window_ms = Number(
    process.env[options.env_window_key ?? "RATE_LIMIT_WINDOW_MS"] ?? 60_000,
  );
  const max_requests = Number(
    process.env[options.env_max_key ?? "RATE_LIMIT_MAX"] ?? 30,
  );

  const ip = getClientIp(request);
  const buckets: string[] = [];

  if (ip) {
    buckets.push(getBucketKey("ip", ip));
  } else {
    const origin = request.headers.get("origin");
    buckets.push(getBucketKey("ip", origin ?? "unknown"));
  }

  if (token_id) {
    buckets.push(getBucketKey("token", token_id));
  }

  let worst_retry_after_ms = 0;

  for (const bucket_key of buckets) {
    const result = checkSingleBucket(store, bucket_key, window_ms, max_requests);
    if (!result.allowed) {
      worst_retry_after_ms = Math.max(worst_retry_after_ms, result.retry_after_ms);
    }
  }

  if (worst_retry_after_ms > 0) {
    return { allowed: false, retry_after_ms: worst_retry_after_ms };
  }

  return { allowed: true, retry_after_ms: 0 };
}

export function enforceClassifyRateLimit(
  request: Request,
  token_id?: string,
): RateLimitResult {
  return enforceDualRateLimit(request, classify_rate_limit_store, token_id);
}

export function enforceVerifyRateLimit(
  request: Request,
  token_id?: string,
): RateLimitResult {
  return enforceDualRateLimit(request, verify_rate_limit_store, token_id, {
    env_max_key: "RATE_LIMIT_VERIFY_MAX",
  });
}
