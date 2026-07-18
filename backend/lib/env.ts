/**
 * Shared env helpers for Supabase + secrets.
 * Fail fast on missing server config; never put service_role behind NEXT_PUBLIC_.
 */

export function requireEnv(name: string): string {
  // Server-only: dynamic process.env[name] is not inlined in client bundles.
  const value = process.env[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`[requireEnv] Missing required environment variable: ${name}`);
  }
  return value;
}

/** Browser + server user clients: publishable key preferred, legacy anon as fallback. */
export function getSupabaseUrl(): string {
  // Must use a literal key — Next.js only inlines NEXT_PUBLIC_* for static access in client bundles.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (typeof url !== "string" || url.length === 0) {
    throw new Error(
      "[getSupabaseUrl] Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL",
    );
  }
  return url;
}

export function getSupabasePublishableKey(): string {
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (typeof publishable === "string" && publishable.length > 0) {
    return publishable;
  }

  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (typeof anon === "string" && anon.length > 0) {
    return anon;
  }

  throw new Error(
    "[getSupabasePublishableKey] Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
}

/** Proxy-safe availability check that mirrors the publishable/legacy-key fallback. */
export function hasSupabasePublicEnv(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    typeof url === "string" &&
    url.length > 0 &&
    ((typeof publishable === "string" && publishable.length > 0) ||
      (typeof anon === "string" && anon.length > 0))
  );
}

export function getSupabaseServiceRoleKey(): string {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}
