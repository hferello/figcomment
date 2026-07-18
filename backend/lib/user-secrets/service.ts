/**
 * User secrets — encrypt in Next.js, persist ciphertext via service_role only.
 * Never return plaintext or ciphertext to clients.
 */

import { ActionError } from "@/lib/auth/action-error";
import { encryptSecret } from "@/lib/crypto/secrets";
import { createAdminClient } from "@/lib/supabase/admin";

export type SecretStatus = {
  figma_saved: boolean;
  anthropic_saved: boolean;
};

export type SaveUserSecretsInput = {
  user_id: string;
  figma_token?: string;
  anthropic_key?: string;
};

type ExistingSecretRow = {
  figma_ciphertext: string | null;
  figma_nonce: string | null;
  anthropic_ciphertext: string | null;
  anthropic_nonce: string | null;
  key_version: number;
};

/**
 * Masked status only — booleans, never ciphertext.
 */
export async function getSecretStatus(user_id: string): Promise<SecretStatus> {
  console.log("[getSecretStatus] started", { user_id });

  const admin = createAdminClient();
  // user_secrets has no authenticated SELECT grant — service_role required even for booleans.
  const { data, error } = await admin
    .from("user_secrets")
    .select("figma_ciphertext, anthropic_ciphertext")
    .eq("user_id", user_id)
    .maybeSingle();

  if (error) {
    console.error("[getSecretStatus] select_failed", { user_id, message: error.message });
    throw new ActionError("internal_error", "Could not load secret status.");
  }

  const status: SecretStatus = {
    figma_saved: Boolean(data?.figma_ciphertext),
    anthropic_saved: Boolean(data?.anthropic_ciphertext),
  };

  console.log("[getSecretStatus] completed", { user_id, ...status });
  return status;
}

/**
 * Upsert encrypted Figma / Anthropic credentials. Empty strings are rejected.
 * Omitted fields keep existing ciphertext unchanged.
 */
export async function saveUserSecrets(input: SaveUserSecretsInput): Promise<SecretStatus> {
  console.log("[saveUserSecrets] started", {
    user_id: input.user_id,
    has_figma: input.figma_token !== undefined,
    has_anthropic: input.anthropic_key !== undefined,
  });

  const admin = createAdminClient();

  // Fetch existing row so partial updates preserve the other provider's ciphertext.
  const { data: existing, error: fetch_error } = await admin
    .from("user_secrets")
    .select(
      "figma_ciphertext, figma_nonce, anthropic_ciphertext, anthropic_nonce, key_version",
    )
    .eq("user_id", input.user_id)
    .maybeSingle();

  if (fetch_error) {
    console.error("[saveUserSecrets] fetch_failed", {
      user_id: input.user_id,
      message: fetch_error.message,
    });
    throw new ActionError("secrets_save_failed", "Could not save credentials.");
  }

  const row: ExistingSecretRow = existing ?? {
    figma_ciphertext: null,
    figma_nonce: null,
    anthropic_ciphertext: null,
    anthropic_nonce: null,
    key_version: 1,
  };

  const upsert_payload: Record<string, string | number | null> = {
    user_id: input.user_id,
    figma_ciphertext: row.figma_ciphertext,
    figma_nonce: row.figma_nonce,
    anthropic_ciphertext: row.anthropic_ciphertext,
    anthropic_nonce: row.anthropic_nonce,
    key_version: row.key_version,
  };

  if (input.figma_token !== undefined) {
    // Encrypt server-side — client never sends or stores ciphertext.
    const encrypted = encryptSecret(input.figma_token);
    upsert_payload.figma_ciphertext = encrypted.ciphertext_b64;
    upsert_payload.figma_nonce = encrypted.nonce_b64;
    upsert_payload.key_version = encrypted.key_version;
  }

  if (input.anthropic_key !== undefined) {
    const encrypted = encryptSecret(input.anthropic_key);
    upsert_payload.anthropic_ciphertext = encrypted.ciphertext_b64;
    upsert_payload.anthropic_nonce = encrypted.nonce_b64;
    upsert_payload.key_version = encrypted.key_version;
  }

  // Write-guard trigger allows only service_role inserts/updates on user_secrets.
  const { error: upsert_error } = await admin
    .from("user_secrets")
    .upsert(upsert_payload, { onConflict: "user_id" });

  if (upsert_error) {
    console.error("[saveUserSecrets] upsert_failed", {
      user_id: input.user_id,
      message: upsert_error.message,
    });
    throw new ActionError("secrets_save_failed", "Could not save credentials.");
  }

  console.log("[saveUserSecrets] completed", { user_id: input.user_id });
  return getSecretStatus(input.user_id);
}
