"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { deleteAccountAction } from "@/app/actions/account";
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

type DeleteAccountSectionProps = {
  account_email: string;
};

/**
 * Danger zone: typed email confirmation before irreversible account wipe.
 */
export function DeleteAccountSection({
  account_email,
}: DeleteAccountSectionProps) {
  const router = useRouter();
  const [is_pending, startTransition] = useTransition();
  const [show_confirm, setShowConfirm] = useState(false);
  const [confirm_email, setConfirmEmail] = useState("");
  const [notice, setNotice] = useState<StatusNotice | null>(null);
  const confirm_button_ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (show_confirm) {
      confirm_button_ref.current?.focus();
    }
  }, [show_confirm]);

  function handleDelete() {
    setNotice(null);

    startTransition(async () => {
      try {
        const result = await deleteAccountAction({ confirm_email });

        if (!result.ok) {
          console.error("[DeleteAccountSection] delete_failed", result.code);
          setNotice({ kind: "error", message: result.message });
          return;
        }

        const supabase = createClient();
        await supabase.auth.signOut();

        router.replace("/");
        router.refresh();
      } catch (error) {
        console.error("[DeleteAccountSection] unexpected_error", error);
        setNotice({
          kind: "error",
          message: "Could not delete your account. Please try again.",
        });
      }
    });
  }

  return (
    <section
      className="rounded-fc-36 border border-destructive/30 bg-fc-panel-peach p-fc-24 md:p-fc-48"
      aria-labelledby="delete-account-heading"
    >
      <p className="text-fc-12 font-medium uppercase tracking-widest text-destructive">
        Danger zone
      </p>
      <h2
        id="delete-account-heading"
        className="mt-fc-12 font-display text-fc-36 font-bold"
      >
        Delete account
      </h2>
      <p className="mt-fc-12 text-fc-18 text-muted-foreground">
        Permanently remove your profile, encrypted credentials, and plugin
        tokens. This cannot be undone.
      </p>

      <StatusAlert
        notice={notice}
        error_title="Could not delete account"
        success_title="Account deleted"
        className="mt-fc-24"
      />

      {!show_confirm ? (
        <Button
          type="button"
          variant="destructive"
          size="lg"
          className="mt-fc-24"
          onClick={() => setShowConfirm(true)}
        >
          Delete my account
        </Button>
      ) : (
        <div
          role="group"
          aria-labelledby="delete-account-confirm-heading"
          className="mt-fc-24 rounded-fc-24 border border-destructive/40 bg-background/60 p-fc-18"
        >
          <h3
            id="delete-account-confirm-heading"
            className="font-display text-fc-21 font-bold"
          >
            Type your email to confirm
          </h3>
          <p className="mt-fc-12 text-fc-14">
            Enter <strong>{account_email}</strong> to permanently delete your
            account.
          </p>

          <FieldGroup className="mt-fc-18">
            <Field>
              <FieldLabel htmlFor="delete-confirm-email">
                Account email
              </FieldLabel>
              <Input
                id="delete-confirm-email"
                name="confirm_email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={confirm_email}
                onChange={(event) => setConfirmEmail(event.target.value)}
                aria-describedby="delete-confirm-email-help"
              />
              <FieldDescription id="delete-confirm-email-help">
                Must match exactly, case insensitive.
              </FieldDescription>
            </Field>
          </FieldGroup>

          <div className="mt-fc-18 flex flex-wrap gap-fc-12">
            <Button
              ref={confirm_button_ref}
              type="button"
              variant="destructive"
              size="lg"
              disabled={is_pending || confirm_email.trim().length === 0}
              onClick={handleDelete}
            >
              {is_pending ? "Deleting…" : "Permanently delete"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              disabled={is_pending}
              onClick={() => {
                setShowConfirm(false);
                setConfirmEmail("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
