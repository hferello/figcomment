/**
 * Decrypt per-user provider credentials for /api/classify only.
 * Do not import from UI or other routes — classify is the sole decrypt path in v1.
 */

import { decryptSecret } from "@/lib/crypto/secrets";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LlmProvider } from "@/lib/user-secrets/service";
import type { ClassifyRequest } from "@/lib/classify/schema";

export type UserProviderCredentials = {
  figma_token: string;
  llm_key: string | null;
  llm_provider: LlmProvider | null;
};

export class MissingProviderCredentialsError extends Error {
  readonly code:
    | "missing_figma_token"
    | "missing_llm_key"
    | "missing_credentials";

  constructor(
    code: "missing_figma_token" | "missing_llm_key" | "missing_credentials",
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
    super("Could not decrypt saved credentials. Re-save your profile credentials.");
    this.name = "InvalidProviderCredentialsError";
  }
}

/**
 * Load and decrypt credentials for an authenticated classify request.
 * Figma token is always required. LLM key is only required for AI sort mode.
 */
export async function loadUserSecretsForClassify(
  user_id: string,
  request_payload: ClassifyRequest,
): Promise<UserProviderCredentials> {
  console.log("[loadUserSecretsForClassify] started", { user_id });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_secrets")
    .select(
      "figma_ciphertext, figma_nonce, anthropic_ciphertext, anthropic_nonce, llm_provider, key_version",
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
      "Save your Figma token in your profile before running analysis.",
    );
  }

  if (!data) {
    console.error("[loadUserSecretsForClassify] no_row", { user_id });
    throw new MissingProviderCredentialsError(
      "missing_credentials",
      "Save your Figma token in your profile before running analysis.",
    );
  }

  if (!data.figma_ciphertext || !data.figma_nonce) {
    console.error("[loadUserSecretsForClassify] missing_figma", { user_id });
    throw new MissingProviderCredentialsError(
      "missing_figma_token",
      "Save your Figma personal access token in your profile before running analysis.",
    );
  }

  try {
    // Sole v1 decrypt path — plaintext exists only in memory for this request.
    const figma_token = decryptSecret({
      ciphertext_b64: data.figma_ciphertext,
      nonce_b64: data.figma_nonce,
      key_version: data.key_version,
    });

    let llm_key: string | null = null;
    let llm_provider: LlmProvider | null =
      data.llm_provider === "openai" ||
      data.llm_provider === "gemini" ||
      data.llm_provider === "anthropic"
        ? data.llm_provider
        : null;

    if (request_payload.sort_method === "ai") {
      if (!data.anthropic_ciphertext || !data.anthropic_nonce) {
        console.error("[loadUserSecretsForClassify] missing_llm_key", { user_id });
        throw new MissingProviderCredentialsError(
          "missing_llm_key",
          "Save a model API key in your profile before using AI sort.",
        );
      }

      if (!llm_provider) {
        llm_provider = "anthropic";
      }

      llm_key = decryptSecret({
        ciphertext_b64: data.anthropic_ciphertext,
        nonce_b64: data.anthropic_nonce,
        key_version: data.key_version,
      });
    }

    console.log("[loadUserSecretsForClassify] completed", { user_id });

    return { figma_token, llm_key, llm_provider };
  } catch {
    console.error("[loadUserSecretsForClassify] decrypt_failed", { user_id });
    throw new InvalidProviderCredentialsError();
  }
}
