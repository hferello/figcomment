/**
 * Plugin token verification for API routes (Phase 3 classify).
 * Uses service_role to resolve bearer token → user_id.
 */

import dayjs from "dayjs";

import { hashPluginToken, parseBearerPluginToken } from "@/lib/crypto/plugin-token";
import { createAdminClient } from "@/lib/supabase/admin";

export type VerifiedPluginToken = {
  token_id: string;
  user_id: string;
  prefix: string;
};

/**
 * Verify `Authorization: Bearer fc_…` and return owning user.
 * Returns null when token is missing, invalid, or revoked — caller maps to 401.
 */
export async function verifyPluginTokenFromHeader(
  authorization_header: string | null,
): Promise<VerifiedPluginToken | null> {
  console.log("[verifyPluginTokenFromHeader] started", {
    has_header: Boolean(authorization_header),
  });

  const raw_token = parseBearerPluginToken(authorization_header);
  if (!raw_token) {
    console.error("[verifyPluginTokenFromHeader] missing_or_malformed_header");
    return null;
  }

  const verified = await verifyPluginToken(raw_token);
  console.log("[verifyPluginTokenFromHeader] completed", {
    verified: Boolean(verified),
    token_prefix: verified?.prefix,
  });
  return verified;
}

export async function verifyPluginToken(
  raw_token: string,
): Promise<VerifiedPluginToken | null> {
  console.log("[verifyPluginToken] started");

  const token_hash = hashPluginToken(raw_token);
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("plugin_tokens")
    .select("id, user_id, prefix, revoked_at, expires_at")
    .eq("token_hash", token_hash)
    .maybeSingle();

  if (error) {
    console.error("[verifyPluginToken] lookup_failed", { message: error.message });
    return null;
  }

  if (!data || data.revoked_at) {
    console.error("[verifyPluginToken] invalid_or_revoked");
    return null;
  }

  if (data.expires_at) {
    const expires_at = dayjs(data.expires_at);
    if (!expires_at.isValid() || !expires_at.isAfter(dayjs())) {
      console.error("[verifyPluginToken] expired_or_invalid_expiry", {
        token_id: data.id,
      });
      return null;
    }
  }

  console.log("[verifyPluginToken] completed", { token_id: data.id, user_id: data.user_id });

  return {
    token_id: data.id,
    user_id: data.user_id,
    prefix: data.prefix,
  };
}

/**
 * Record last_used_at after a successful authenticated request (service_role).
 * Best-effort — classify response is not blocked if this update fails.
 */
export async function touchPluginTokenLastUsed(token_id: string): Promise<void> {
  console.log("[touchPluginTokenLastUsed] started", { token_id });

  const admin = createAdminClient();
  const last_used_at = dayjs().toISOString();

  const { error } = await admin
    .from("plugin_tokens")
    .update({ last_used_at })
    .eq("id", token_id)
    .is("revoked_at", null);

  if (error) {
    console.error("[touchPluginTokenLastUsed] update_failed", {
      token_id,
      message: error.message,
    });
    return;
  }

  console.log("[touchPluginTokenLastUsed] completed", { token_id });
}
