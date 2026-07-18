/**
 * Plugin token lifecycle — mint / rotate / revoke via service_role;
 * metadata reads via user session client (RLS + column grants).
 */

import dayjs from "dayjs";

import { ActionError } from "@/lib/auth/action-error";
import { generatePluginToken } from "@/lib/crypto/plugin-token";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type PluginTokenMetadata = {
  id: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
};

export type MintPluginTokenResult = {
  token: string;
  metadata: PluginTokenMetadata;
};

const METADATA_COLUMNS =
  "id, prefix, created_at, last_used_at, revoked_at, expires_at" as const;

/**
 * Active token metadata for the signed-in user (server client + RLS).
 */
export async function getActivePluginTokenMetadata(
  user_id: string,
): Promise<PluginTokenMetadata | null> {
  console.log("[getActivePluginTokenMetadata] started", { user_id });

  const supabase = await createClient();
  // Explicit column list — token_hash is revoked via column grants for authenticated role.
  const { data, error } = await supabase
    .from("plugin_tokens")
    .select(METADATA_COLUMNS)
    .eq("user_id", user_id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getActivePluginTokenMetadata] select_failed", {
      user_id,
      message: error.message,
    });
    throw new ActionError("internal_error", "Could not load plugin token status.");
  }

  console.log("[getActivePluginTokenMetadata] completed", {
    user_id,
    has_active: Boolean(data),
  });

  return data ?? null;
}

/**
 * Mint a new plugin token. Rejects if an active token already exists (use rotate).
 */
export async function mintPluginToken(user_id: string): Promise<MintPluginTokenResult> {
  console.log("[mintPluginToken] started", { user_id });

  const active = await getActivePluginTokenMetadata(user_id);
  if (active) {
    console.error("[mintPluginToken] active_token_exists", { user_id, token_id: active.id });
    throw new ActionError(
      "active_token_exists",
      "You already have an active plugin token. Rotate or revoke it first.",
    );
  }

  const generated = generatePluginToken();
  const admin = createAdminClient();

  // Lifecycle writes (insert hash) must use service_role — RLS write-guard blocks authenticated.
  const { data, error } = await admin
    .from("plugin_tokens")
    .insert({
      user_id,
      token_hash: generated.token_hash,
      prefix: generated.prefix,
    })
    .select(METADATA_COLUMNS)
    .single();

  if (error || !data) {
    console.error("[mintPluginToken] insert_failed", {
      user_id,
      message: error?.message,
    });
    throw new ActionError("token_mint_failed", "Could not mint plugin token.");
  }

  console.log("[mintPluginToken] completed", { user_id, token_id: data.id });

  return {
    token: generated.token,
    metadata: data,
  };
}

/**
 * Revoke the current active token (service_role).
 */
export async function revokeActivePluginToken(user_id: string): Promise<void> {
  console.log("[revokeActivePluginToken] started", { user_id });

  const active = await getActivePluginTokenMetadata(user_id);
  if (!active) {
    console.error("[revokeActivePluginToken] no_active_token", { user_id });
    throw new ActionError("no_active_token", "No active plugin token to revoke.");
  }

  const admin = createAdminClient();
  const revoked_at = dayjs().toISOString();

  // revoked_at is a privileged lifecycle column — only service_role may set it.
  const { error } = await admin
    .from("plugin_tokens")
    .update({ revoked_at })
    .eq("id", active.id)
    .eq("user_id", user_id)
    .is("revoked_at", null);

  if (error) {
    console.error("[revokeActivePluginToken] update_failed", {
      user_id,
      token_id: active.id,
      message: error.message,
    });
    throw new ActionError("token_revoke_failed", "Could not revoke plugin token.");
  }

  console.log("[revokeActivePluginToken] completed", { user_id, token_id: active.id });
}

/**
 * Rotate = revoke current active token, then mint a new one.
 */
export async function rotatePluginToken(user_id: string): Promise<MintPluginTokenResult> {
  console.log("[rotatePluginToken] started", { user_id });

  const active = await getActivePluginTokenMetadata(user_id);
  if (!active) {
    console.error("[rotatePluginToken] no_active_token", { user_id });
    throw new ActionError("no_active_token", "No active plugin token to rotate.");
  }

  const admin = createAdminClient();
  const revoked_at = dayjs().toISOString();

  const { error: revoke_error } = await admin
    .from("plugin_tokens")
    .update({ revoked_at })
    .eq("id", active.id)
    .eq("user_id", user_id)
    .is("revoked_at", null);

  if (revoke_error) {
    console.error("[rotatePluginToken] revoke_failed", {
      user_id,
      token_id: active.id,
      message: revoke_error.message,
    });
    throw new ActionError("token_rotate_failed", "Could not rotate plugin token.");
  }

  const generated = generatePluginToken();

  // Insert new active row — partial unique index enforces one non-revoked token per user.
  const { data, error: insert_error } = await admin
    .from("plugin_tokens")
    .insert({
      user_id,
      token_hash: generated.token_hash,
      prefix: generated.prefix,
    })
    .select(METADATA_COLUMNS)
    .single();

  if (insert_error || !data) {
    console.error("[rotatePluginToken] mint_failed", {
      user_id,
      message: insert_error?.message,
    });
    throw new ActionError(
      "token_rotate_failed",
      "Old token was revoked but the new token could not be created. Try minting again.",
    );
  }

  console.log("[rotatePluginToken] completed", { user_id, token_id: data.id });

  return {
    token: generated.token,
    metadata: data,
  };
}
