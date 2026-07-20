"use server";

/**
 * Server actions for login, signup, and password recovery.
 *
 * All actions run two abuse checks BEFORE touching Supabase:
 * 1. Vercel BotID — server-side classification of the request session.
 * 2. Honeypot — a hidden "website" field real users never fill in.
 *
 * Auth itself uses the cookie-bound server Supabase client, so a successful
 * sign-in/sign-up writes the session cookie on the server response.
 * Password recovery only triggers the email — no session is created here.
 */

import { checkBotId } from "botid/server";
import { headers } from "next/headers";
import { z } from "zod";
import {
  ActionError,
  actionErr,
  actionOk,
  type ActionResult,
} from "@/lib/auth/action-error";
import { createClient } from "@/lib/supabase/server";

const credentials_schema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters."),
  // Honeypot: legitimate browsers submit this hidden field empty.
  website: z.string(),
});

const forgot_password_schema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  // Honeypot: legitimate browsers submit this hidden field empty.
  website: z.string(),
});

type CredentialsInput = z.infer<typeof credentials_schema>;
type ForgotPasswordInput = z.infer<typeof forgot_password_schema>;

/**
 * Runs BotID + honeypot checks. Returns true when the request is trusted.
 * BotID failures throw (blocked loudly); honeypot hits return false so the
 * caller can fake a success and keep the bot guessing.
 */
async function isTrustedRequest(
  action_name: string,
  honeypot_value: string,
): Promise<boolean> {
  const verification = await checkBotId();

  if (verification.isBot) {
    console.error(`[${action_name}] blocked_by_botid`);
    throw new ActionError("request_blocked", "Access denied.");
  }

  if (honeypot_value.length > 0) {
    console.error(`[${action_name}] honeypot_triggered`);
    return false;
  }

  return true;
}

/**
 * Base URL for the email-confirmation callback. Prefers the configured app
 * URL and falls back to the request origin (works in previews and locally).
 */
async function resolveAppUrl(): Promise<string> {
  const configured_url = process.env.NEXT_PUBLIC_APP_URL;
  if (typeof configured_url === "string" && configured_url.length > 0) {
    return configured_url;
  }

  const headers_list = await headers();
  const origin = headers_list.get("origin");
  if (origin !== null && origin.length > 0) {
    return origin;
  }

  const host = headers_list.get("host") ?? "localhost:3000";
  return `https://${host}`;
}

export async function loginAction(
  input: CredentialsInput,
): Promise<ActionResult<{ logged_in: true }>> {
  console.log("[loginAction] started");

  try {
    const parsed = credentials_schema.parse(input);

    const trusted = await isTrustedRequest("loginAction", parsed.website);
    if (!trusted) {
      // Honeypot hit: return the same error a wrong password would produce,
      // so the bot cannot tell it was detected.
      return actionErr(
        new ActionError("auth_failed", "Invalid login credentials"),
      );
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.email,
      password: parsed.password,
    });

    if (error) {
      console.error("[loginAction] login_failed", error);
      return actionErr(new ActionError("auth_failed", error.message));
    }

    console.log("[loginAction] completed");
    return actionOk({ logged_in: true });
  } catch (error) {
    console.error("[loginAction] failed", error);
    if (error instanceof z.ZodError) {
      return actionErr(
        new ActionError(
          "validation_error",
          error.issues[0]?.message ?? "Invalid input.",
        ),
      );
    }
    return actionErr(error, "auth_failed");
  }
}

export async function signupAction(
  input: CredentialsInput,
): Promise<ActionResult<{ requires_confirmation: boolean }>> {
  console.log("[signupAction] started");

  try {
    const parsed = credentials_schema.parse(input);

    const trusted = await isTrustedRequest("signupAction", parsed.website);
    if (!trusted) {
      // Honeypot hit: fake the "confirmation email sent" success path.
      // No account is created and no email is sent.
      return actionOk({ requires_confirmation: true });
    }

    const app_url = await resolveAppUrl();
    const callback_url = `${app_url}/auth/callback?next=/profile`;

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.email,
      password: parsed.password,
      options: { emailRedirectTo: callback_url },
    });

    if (error) {
      console.error("[signupAction] signup_failed", error);
      return actionErr(new ActionError("auth_failed", error.message));
    }

    console.log("[signupAction] completed", {
      requires_confirmation: data.session === null,
    });
    return actionOk({ requires_confirmation: data.session === null });
  } catch (error) {
    console.error("[signupAction] failed", error);
    if (error instanceof z.ZodError) {
      return actionErr(
        new ActionError(
          "validation_error",
          error.issues[0]?.message ?? "Invalid input.",
        ),
      );
    }
    return actionErr(error, "auth_failed");
  }
}

/**
 * Sends a password-recovery email via Supabase. Always returns the same
 * success shape on honeypot hits so bots cannot probe which emails exist.
 */
export async function forgotPasswordAction(
  input: ForgotPasswordInput,
): Promise<ActionResult<{ email_sent: true }>> {
  console.log("[forgotPasswordAction] started");

  try {
    const parsed = forgot_password_schema.parse(input);

    const trusted = await isTrustedRequest(
      "forgotPasswordAction",
      parsed.website,
    );
    if (!trusted) {
      // Honeypot hit: fake the success path. No email is sent.
      return actionOk({ email_sent: true });
    }

    const app_url = await resolveAppUrl();
    const redirect_to = `${app_url}/auth/callback?next=/reset-password`;

    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.email, {
      redirectTo: redirect_to,
    });

    if (error) {
      console.error("[forgotPasswordAction] reset_failed", error);
      return actionErr(new ActionError("auth_failed", error.message));
    }

    console.log("[forgotPasswordAction] completed");
    return actionOk({ email_sent: true });
  } catch (error) {
    console.error("[forgotPasswordAction] failed", error);
    if (error instanceof z.ZodError) {
      return actionErr(
        new ActionError(
          "validation_error",
          error.issues[0]?.message ?? "Invalid input.",
        ),
      );
    }
    return actionErr(error, "auth_failed");
  }
}
