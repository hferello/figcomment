"use client";

import Link from "next/link";
import { useState, useTransition, type SubmitEvent } from "react";
import {
  StatusAlert,
  type StatusNotice,
} from "@/components/shared/status-alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

/**
 * Sends Supabase password recovery email; user completes reset via /auth/callback.
 */
export function ForgotPasswordForm() {
  const [is_pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<StatusNotice | null>(null);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    const form_data = new FormData(event.currentTarget);
    const email_value = form_data.get("email");

    if (typeof email_value !== "string" || email_value.trim().length === 0) {
      setNotice({
        kind: "error",
        message: "Please enter your email address.",
      });
      return;
    }

    const supabase = createClient();

    startTransition(async () => {
      try {
        const app_url =
          process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
        const redirect_to = `${app_url}/auth/callback?next=/reset-password`;

        const { error } = await supabase.auth.resetPasswordForEmail(
          email_value.trim(),
          { redirectTo: redirect_to },
        );

        if (error) {
          console.error("[ForgotPasswordForm] reset_failed", error);
          setNotice({ kind: "error", message: error.message });
          return;
        }

        setNotice({
          kind: "success",
          message:
            "If an account exists for that email, we sent a reset link. Check your inbox.",
        });
      } catch (error) {
        console.error("[ForgotPasswordForm] unexpected_error", error);
        setNotice({
          kind: "error",
          message: "Something went wrong. Please try again.",
        });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <StatusAlert
          notice={notice}
          error_title="Could not send reset email"
          success_title="Check your inbox"
        />

        <Field>
          <FieldLabel htmlFor="forgot-email">Email address</FieldLabel>
          <Input
            id="forgot-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            aria-describedby="forgot-email-help"
          />
          <FieldDescription id="forgot-email-help">
            We will email a secure link to choose a new password.
          </FieldDescription>
        </Field>

        <Button
          type="submit"
          size="lg"
          disabled={is_pending}
          className="w-full"
        >
          {is_pending ? "Sending…" : "Send reset link"}
        </Button>
      </FieldGroup>

      <p className="mt-fc-24 text-center text-fc-14 text-muted-foreground">
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-medium text-fc-ink underline underline-offset-4"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}
