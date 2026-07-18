/**
 * Account deletion — privileged wipe of secrets/tokens then Auth user delete.
 * Intent: defense-in-depth before auth.users cascade removes profile rows.
 */

import { ActionError } from "@/lib/auth/action-error";
import { createAdminClient } from "@/lib/supabase/admin";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Irreversibly delete a user account after email confirmation matches.
 */
export async function deleteUserAccount(args: {
  user_id: string;
  user_email: string;
  confirm_email: string;
}): Promise<void> {
  console.log("[deleteUserAccount] started", { user_id: args.user_id });

  if (normalizeEmail(args.confirm_email) !== normalizeEmail(args.user_email)) {
    console.error("[deleteUserAccount] email_mismatch", { user_id: args.user_id });
    throw new ActionError(
      "validation_error",
      "The email you entered does not match your account.",
    );
  }

  const admin = createAdminClient();

  const { error: secrets_error } = await admin
    .from("user_secrets")
    .delete()
    .eq("user_id", args.user_id);

  if (secrets_error) {
    console.error("[deleteUserAccount] secrets_delete_failed", {
      user_id: args.user_id,
      message: secrets_error.message,
    });
    throw new ActionError("internal_error", "Could not delete stored credentials.");
  }

  const { error: tokens_error } = await admin
    .from("plugin_tokens")
    .delete()
    .eq("user_id", args.user_id);

  if (tokens_error) {
    console.error("[deleteUserAccount] tokens_delete_failed", {
      user_id: args.user_id,
      message: tokens_error.message,
    });
    throw new ActionError("internal_error", "Could not revoke plugin tokens.");
  }

  const { error: auth_delete_error } = await admin.auth.admin.deleteUser(args.user_id);

  if (auth_delete_error) {
    console.error("[deleteUserAccount] auth_delete_failed", {
      user_id: args.user_id,
      message: auth_delete_error.message,
    });
    throw new ActionError("internal_error", "Could not delete your account.");
  }

  console.log("[deleteUserAccount] completed", { user_id: args.user_id });
}
