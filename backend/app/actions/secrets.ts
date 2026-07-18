"use server";

/**
 * Server actions: save Figma / Anthropic credentials (encrypted at rest).
 * Context: Phase 4 profile UI calls these; writes go through service_role after AES-GCM encrypt.
 */

import { z } from "zod";
import {
  ActionError,
  actionErr,
  actionOk,
  type ActionResult,
} from "@/lib/auth/action-error";
import {
  requireEmailConfirmedUser,
} from "@/lib/auth/require-session";
import {
  saveUserSecrets,
  type SecretStatus,
} from "@/lib/user-secrets/service";

const save_secrets_schema = z
  .object({
    figma_token: z.string().optional(),
    anthropic_key: z.string().optional(),
  })
  .refine(
    (value) => value.figma_token !== undefined || value.anthropic_key !== undefined,
    { message: "Provide at least one credential to save." },
  )
  .refine(
    (value) =>
      (value.figma_token === undefined || value.figma_token.trim().length > 0) &&
      (value.anthropic_key === undefined || value.anthropic_key.trim().length > 0),
    { message: "Credentials cannot be empty." },
  );

export async function saveUserSecretsAction(input: {
  figma_token?: string;
  anthropic_key?: string;
}): Promise<ActionResult<SecretStatus>> {
  console.log("[saveUserSecretsAction] started");

  try {
    // Step 1: require confirmed email — unverified users must not store provider keys.
    const user = await requireEmailConfirmedUser();

    // Step 2: validate input shape; reject empty strings.
    const parsed = save_secrets_schema.parse(input);

    // Step 3: encrypt + upsert via service_role; return masked status only.
    const status = await saveUserSecrets({
      user_id: user.id,
      figma_token: parsed.figma_token?.trim(),
      anthropic_key: parsed.anthropic_key?.trim(),
    });

    console.log("[saveUserSecretsAction] completed", { user_id: user.id });
    return actionOk(status);
  } catch (error) {
    console.error("[saveUserSecretsAction] failed", error);
    if (error instanceof z.ZodError) {
      return actionErr(
        new ActionError(
          "validation_error",
          error.issues[0]?.message ?? "Invalid input.",
        ),
      );
    }
    return actionErr(error);
  }
}
