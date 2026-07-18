"use server";

/**
 * Server action: irreversible account deletion after typed email confirmation.
 */

import { z } from "zod";
import {
  ActionError,
  actionErr,
  actionOk,
  type ActionResult,
} from "@/lib/auth/action-error";
import { requireAuthenticatedUser } from "@/lib/auth/require-session";
import { deleteUserAccount } from "@/lib/account/delete-user";

const delete_account_schema = z.object({
  confirm_email: z.string().email("Enter a valid email address."),
});

export async function deleteAccountAction(input: {
  confirm_email: string;
}): Promise<ActionResult<{ deleted: true }>> {
  console.log("[deleteAccountAction] started");

  try {
    const user = await requireAuthenticatedUser();

    if (!user.email) {
      throw new ActionError(
        "validation_error",
        "Your account has no email address on file.",
      );
    }

    const parsed = delete_account_schema.parse(input);

    await deleteUserAccount({
      user_id: user.id,
      user_email: user.email,
      confirm_email: parsed.confirm_email,
    });

    console.log("[deleteAccountAction] completed", { user_id: user.id });
    return actionOk({ deleted: true });
  } catch (error) {
    console.error("[deleteAccountAction] failed", error);
    if (error instanceof z.ZodError) {
      return actionErr(
        new ActionError(
          "validation_error",
          error.issues[0]?.message ?? "Invalid input.",
        ),
      );
    }
    return actionErr(error, "account_delete_failed");
  }
}
