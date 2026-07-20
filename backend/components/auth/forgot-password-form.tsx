"use client";

import Link from "next/link";
import { useState, useTransition, type SubmitEvent } from "react";
import { forgotPasswordAction } from "@/app/actions/auth";
import { HoneypotField } from "@/components/shared/honeypot-field";
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

/**
 * Password recovery island. Submits through forgotPasswordAction so BotID +
 * honeypot checks run before Supabase sends the reset email.
 */
export function ForgotPasswordForm() {
  const [is_pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<StatusNotice | null>(null);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    const form_data = new FormData(event.currentTarget);
    const email_value = form_data.get("email");
    const website_value = form_data.get("website");

    if (typeof email_value !== "string" || email_value.trim().length === 0) {
      setNotice({
        kind: "error",
        message: "Please enter your email address.",
      });
      return;
    }

    startTransition(async () => {
      try {
        const result = await forgotPasswordAction({
          email: email_value.trim(),
          website: typeof website_value === "string" ? website_value : "",
        });

        if (!result.ok) {
          console.error("[ForgotPasswordForm] reset_failed", result.code);
          setNotice({ kind: "error", message: result.message });
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
      <HoneypotField id="forgot-website" />
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
