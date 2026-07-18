/**
 * Session guards for server actions — verify user via server Supabase client (RLS context).
 * Intent: never trust client-supplied user ids; always resolve identity from the session JWT.
 */

import type { User } from "@supabase/supabase-js";
import { ActionError } from "@/lib/auth/action-error";
import { createClient } from "@/lib/supabase/server";

export type AuthenticatedUser = User & { id: string };

/**
 * Require a signed-in user. Uses getUser() (validates JWT with Auth server).
 */
export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  console.log("[requireAuthenticatedUser] started");

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("[requireAuthenticatedUser] getUser_failed", { message: error.message });
    throw new ActionError("unauthenticated", "You must be signed in.");
  }

  if (!user) {
    console.error("[requireAuthenticatedUser] no_user");
    throw new ActionError("unauthenticated", "You must be signed in.");
  }

  console.log("[requireAuthenticatedUser] completed", { user_id: user.id });
  return user as AuthenticatedUser;
}

/**
 * Block plugin-token mint, secret saves, and classify until email is confirmed.
 * Product rule: unverified accounts must not consume provider API quota.
 */
export async function requireEmailConfirmedUser(): Promise<AuthenticatedUser> {
  console.log("[requireEmailConfirmedUser] started");

  const user = await requireAuthenticatedUser();

  if (!user.email_confirmed_at) {
    console.error("[requireEmailConfirmedUser] email_not_confirmed", { user_id: user.id });
    throw new ActionError(
      "email_not_confirmed",
      "Confirm your email before saving secrets or minting a plugin token.",
    );
  }

  console.log("[requireEmailConfirmedUser] completed", { user_id: user.id });
  return user;
}
