/**
 * Decrypt per-user provider credentials for /api/classify only.
 * Do not import from UI or other routes — classify is the sole decrypt path in v1.
 */

import { decryptSecret } from "@/lib/crypto/secrets";
import { createAdminClient } from "@/lib/supabase/admin";

export type UserProviderCredentials = {
  figma_token: string;
  anthropic_key: string;
};

export class MissingProviderCredentialsError extends Error {
  readonly code: "missing_figma_token" | "missing_anthropic_key" | "missing_credentials";

  constructor(
    code: "missing_figma_token" | "missing_anthropic_key" | "missing_credentials",
    message: string,
  ) {
    super(message);
    this.name = "MissingProviderCredentialsError";
    this.code = code;
  }
}

export class InvalidProviderCredentialsError extends Error {
  readonly code = "invalid_credentials" as const;

  constructor() {
    super(
      "Could not decrypt saved credentials. Re-save your Figma and Anthropic keys in your profile.",
    );
    this.name = "InvalidProviderCredentialsError";
  }
}

/**
 * Load and decrypt Figma + Anthropic keys for an authenticated classify request.
 */
export async function loadUserSecretsForClassify(
  user_id: string,
): Promise<UserProviderCredentials> {
  console.log("[loadUserSecretsForClassify] started", { user_id });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_secrets")
    .select(
      "figma_ciphertext, figma_nonce, anthropic_ciphertext, anthropic_nonce, key_version",
    )
    .eq("user_id", user_id)
    .maybeSingle();

  if (error) {
    console.error("[loadUserSecretsForClassify] select_failed", {
      user_id,
      message: error.message,
    });
    throw new MissingProviderCredentialsError(
      "missing_credentials",
      "Save your Figma and Anthropic credentials in your profile before running analysis.",
    );
  }

  if (!data) {
    console.error("[loadUserSecretsForClassify] no_row", { user_id });
    throw new MissingProviderCredentialsError(
      "missing_credentials",
      "Save your Figma and Anthropic credentials in your profile before running analysis.",
    );
  }

  if (!data.figma_ciphertext || !data.figma_nonce) {
    console.error("[loadUserSecretsForClassify] missing_figma", { user_id });
    throw new MissingProviderCredentialsError(
      "missing_figma_token",
      "Save your Figma personal access token in your profile before running analysis.",
    );
  }

  if (!data.anthropic_ciphertext || !data.anthropic_nonce) {
    console.error("[loadUserSecretsForClassify] missing_anthropic", { user_id });
    throw new MissingProviderCredentialsError(
      "missing_anthropic_key",
      "Save your Anthropic API key in your profile before running analysis.",
    );
  }

  try {
    // Sole v1 decrypt path — plaintext exists only in memory for this request.
    const figma_token = decryptSecret({
      ciphertext_b64: data.figma_ciphertext,
      nonce_b64: data.figma_nonce,
      key_version: data.key_version,
    });

    const anthropic_key = decryptSecret({
      ciphertext_b64: data.anthropic_ciphertext,
      nonce_b64: data.anthropic_nonce,
      key_version: data.key_version,
    });

    console.log("[loadUserSecretsForClassify] completed", { user_id });

    return { figma_token, anthropic_key };
  } catch (decrypt_error) {
    console.error("[loadUserSecretsForClassify] decrypt_failed", { user_id });
    throw new InvalidProviderCredentialsError();
  }
}
