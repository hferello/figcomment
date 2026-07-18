/**
 * Email confirmation gate for API routes (classify, etc.).
 * Uses service_role — auth.users is not readable via user session client or RLS.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export class EmailNotConfirmedError extends Error {
  readonly code = "email_not_confirmed" as const;

  constructor() {
    super("Confirm your email before running analysis.");
    this.name = "EmailNotConfirmedError";
  }
}

/**
 * Throws when the user's email is not confirmed.
 * Classify and token mint share this gate so unverified users cannot run analysis.
 */
export async function assertEmailConfirmedForUser(user_id: string): Promise<void> {
  console.log("[assertEmailConfirmedForUser] started", { user_id });

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(user_id);

  if (error) {
    console.error("[assertEmailConfirmedForUser] lookup_failed", {
      user_id,
      message: error.message,
    });
    throw new EmailNotConfirmedError();
  }

  if (!data.user?.email_confirmed_at) {
    console.error("[assertEmailConfirmedForUser] not_confirmed", { user_id });
    throw new EmailNotConfirmedError();
  }

  console.log("[assertEmailConfirmedForUser] completed", { user_id });
}
