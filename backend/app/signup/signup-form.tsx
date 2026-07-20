"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useState,
  useTransition,
  type ChangeEvent,
  type SubmitEvent,
} from "react";
import { signupAction } from "@/app/actions/auth";
import { HoneypotField } from "@/components/shared/honeypot-field";
import { PasswordField } from "@/components/shared/password-field";
import { PasswordStrengthMeter } from "@/components/shared/password-strength-meter";
import {
  StatusAlert,
  type StatusNotice,
} from "@/components/shared/status-alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type SignupFormProps = {
  onEmailConfirmationRequired: (email: string) => void;
};

/**
 * Signup form island. Submits through the signupAction server action so
 * BotID + honeypot checks run before Supabase sees the credentials. On
 * success without a session, hands off to the success panel.
 */
export function SignupForm({ onEmailConfirmationRequired }: SignupFormProps) {
  const router = useRouter();
  const [is_pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<StatusNotice | null>(null);
  const [password_error, setPasswordError] = useState<string | null>(null);
  const [email_value, setEmailValue] = useState("");
  const [password_value, setPasswordValue] = useState("");

  function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
    setEmailValue(event.target.value);
  }

  function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
    setPasswordValue(event.target.value);
    if (password_error !== null) {
      setPasswordError(null);
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    setPasswordError(null);

    const form_data = new FormData(event.currentTarget);
    const submitted_email = form_data.get("email");
    const submitted_password = form_data.get("password");
    const submitted_website = form_data.get("website");

    if (
      typeof submitted_email !== "string" ||
      typeof submitted_password !== "string"
    ) {
      console.error("[SignupForm] invalid_form_values");
      setNotice({
        kind: "error",
        message: "Please enter your email and password.",
      });
      return;
    }

    if (submitted_password.length < 8) {
      setPasswordError("Use at least 8 characters.");
      return;
    }

    const trimmed_email = submitted_email.trim();

    startTransition(async () => {
      try {
        const result = await signupAction({
          email: trimmed_email,
          password: submitted_password,
          website: typeof submitted_website === "string" ? submitted_website : "",
        });

        if (!result.ok) {
          console.error("[SignupForm] signup_failed", result.code);
          setNotice({ kind: "error", message: result.message });
          return;
        }

        if (!result.data.requires_confirmation) {
          router.replace("/profile");
          router.refresh();
          return;
        }

        onEmailConfirmationRequired(trimmed_email);
      } catch (error) {
        console.error("[SignupForm] unexpected_error", error);
        setNotice({
          kind: "error",
          message: "Something went wrong. Please try again.",
        });
      }
    });
  }

  const password_described_by = [
    "signup-password-help",
    password_value.length > 0 ? "signup-password-strength" : null,
    password_error ? "signup-password-error" : null,
  ]
    .filter((value): value is string => value !== null)
    .join(" ");

  return (
    <form onSubmit={handleSubmit}>
      <HoneypotField id="signup-website" />
      <FieldGroup>
        <StatusAlert
          notice={notice}
          error_title="Could not continue"
          success_title="Almost there"
        />

        <Field>
          <FieldLabel htmlFor="signup-email">Email address</FieldLabel>
          <Input
            id="signup-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email_value}
            onChange={handleEmailChange}
            aria-describedby="signup-email-help"
          />
          <FieldDescription id="signup-email-help">
            We will send a confirmation link to this address.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="signup-password">Password</FieldLabel>
          <PasswordField
            id="signup-password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password_value}
            onChange={handlePasswordChange}
            aria-invalid={password_error !== null}
            aria-describedby={password_described_by}
          />
          <FieldDescription id="signup-password-help">
            Use at least 8 characters. Longer phrases are stronger than short
            complex ones.
          </FieldDescription>
          <PasswordStrengthMeter
            id="signup-password-strength"
            password={password_value}
            email={email_value}
          />
          {password_error ? (
            <FieldError id="signup-password-error">{password_error}</FieldError>
          ) : null}
        </Field>

        <Button
          type="submit"
          size="lg"
          disabled={is_pending}
          className="w-full"
        >
          {is_pending ? "Please wait…" : "Create account"}
        </Button>
      </FieldGroup>

      <p className="mt-fc-24 text-center text-fc-14 text-muted-foreground">
        Already have an account?{" "}
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
