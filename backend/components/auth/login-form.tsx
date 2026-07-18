"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useState,
  useTransition,
  type ChangeEvent,
  type SubmitEvent,
} from "react";
import { PasswordField } from "@/components/shared/password-field";
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
import { createClient } from "@/lib/supabase/client";

/**
 * Login-only auth island. Supabase owns password hashing and writes the session cookie.
 */
export function LoginForm() {
  const router = useRouter();
  const [is_pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<StatusNotice | null>(null);
  const [password_error, setPasswordError] = useState<string | null>(null);
  const [password_value, setPasswordValue] = useState("");

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

    if (
      typeof submitted_email !== "string" ||
      typeof submitted_password !== "string"
    ) {
      console.error("[LoginForm] invalid_form_values");
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

    const supabase = createClient();

    startTransition(async () => {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: submitted_email.trim(),
          password: submitted_password,
        });

        if (error) {
          console.error("[LoginForm] login_failed", error);
          setNotice({ kind: "error", message: error.message });
          return;
        }

        router.replace("/profile");
        router.refresh();
      } catch (error) {
        console.error("[LoginForm] unexpected_error", error);
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
          error_title="Could not continue"
          success_title="Almost there"
        />

        <Field>
          <FieldLabel htmlFor="login-email">Email address</FieldLabel>
          <Input
            id="login-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            aria-describedby="login-email-help"
          />
          <FieldDescription id="login-email-help">
            Use the address connected to your Figcomment account.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="login-password">Password</FieldLabel>
          <PasswordField
            id="login-password"
            name="password"
            autoComplete="current-password"
            required
            minLength={8}
            value={password_value}
            onChange={handlePasswordChange}
            aria-invalid={password_error !== null}
            aria-describedby={
              password_error ? "login-password-error" : undefined
            }
          />
          {password_error ? (
            <FieldError id="login-password-error">{password_error}</FieldError>
          ) : null}
          <p className="mt-fc-12 text-fc-14">
            <Link
              href="/forgot-password"
              className="font-medium text-fc-ink underline underline-offset-4"
            >
              Forgot password?
            </Link>
          </p>
        </Field>

        <Button
          type="submit"
          size="lg"
          disabled={is_pending}
          className="w-full"
        >
          {is_pending ? "Please wait…" : "Log in"}
        </Button>
      </FieldGroup>

      <p className="mt-fc-24 text-center text-fc-14 text-muted-foreground">
        New to Figcomment?{" "}
        <Link
          href="/signup"
          className="font-medium text-fc-ink underline underline-offset-4"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
