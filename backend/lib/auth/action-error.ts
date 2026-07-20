/**
 * Typed errors for server actions — safe codes/messages for the client.
 * Intent: map internal failures to stable `ActionErrorCode` values the UI can branch on.
 */

export type ActionErrorCode =
  | "unauthenticated"
  | "email_not_confirmed"
  | "auth_failed"
  | "request_blocked"
  | "validation_error"
  | "active_token_exists"
  | "no_active_token"
  | "secrets_required"
  | "secrets_save_failed"
  | "token_mint_failed"
  | "token_rotate_failed"
  | "token_revoke_failed"
  | "account_delete_failed"
  | "internal_error";

export class ActionError extends Error {
  readonly code: ActionErrorCode;

  constructor(code: ActionErrorCode, message: string) {
    super(message);
    this.name = "ActionError";
    this.code = code;
  }
}

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ActionErrorCode; message: string };

export function actionOk<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function actionErr(
  error: ActionError | unknown,
  fallback_code: ActionErrorCode = "internal_error",
): ActionResult<never> {
  if (error instanceof ActionError) {
    return { ok: false, code: error.code, message: error.message };
  }

  console.error("[actionErr] unexpected_error", error);
  return {
    ok: false,
    code: fallback_code,
    message: "Something went wrong. Please try again.",
  };
}
