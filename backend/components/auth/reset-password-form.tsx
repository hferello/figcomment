"use client";

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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";

/**
 * Sets a new password after Supabase recovery callback established a session.
 */
export function ResetPasswordForm() {
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
    const password = form_data.get("password");
    const confirm_password = form_data.get("confirm_password");

    if (typeof password !== "string" || typeof confirm_password !== "string") {
      setNotice({
        kind: "error",
        message: "Please enter and confirm your new password.",
      });
      return;
    }

    if (password.length < 8) {
      setPasswordError("Use at least 8 characters.");
      return;
    }

    if (password !== confirm_password) {
      setNotice({
        kind: "error",
        message: "Passwords do not match.",
      });
      return;
    }

    const supabase = createClient();

    startTransition(async () => {
      try {
        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
          console.error("[ResetPasswordForm] update_failed", error);
          setNotice({ kind: "error", message: error.message });
          return;
        }

        router.replace("/profile");
        router.refresh();
      } catch (error) {
        console.error("[ResetPasswordForm] unexpected_error", error);
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
          error_title="Could not update password"
          success_title="Password updated"
        />

        <Field>
          <FieldLabel htmlFor="reset-password">New password</FieldLabel>
          <PasswordField
            id="reset-password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password_value}
            onChange={handlePasswordChange}
            aria-invalid={password_error !== null}
            aria-describedby={
              password_error ? "reset-password-error" : undefined
            }
          />
          {password_error ? (
            <FieldError id="reset-password-error">{password_error}</FieldError>
          ) : null}
        </Field>

        <Field>
          <FieldLabel htmlFor="reset-password-confirm">Confirm password</FieldLabel>
          <PasswordField
            id="reset-password-confirm"
            name="confirm_password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </Field>

        <Button
          type="submit"
          size="lg"
          disabled={is_pending}
          className="w-full"
        >
          {is_pending ? "Saving…" : "Save new password"}
        </Button>
      </FieldGroup>
    </form>
  );
}
