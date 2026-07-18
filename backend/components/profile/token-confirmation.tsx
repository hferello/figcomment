"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

type TokenConfirmationProps = {
  action: "rotate" | "revoke";
  is_pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Focuses the newly revealed confirmation so keyboard and screen-reader users
 * immediately reach the destructive decision.
 */
export function TokenConfirmation({
  action,
  is_pending,
  onConfirm,
  onCancel,
}: TokenConfirmationProps) {
  const confirm_button_ref = useRef<HTMLButtonElement>(null);
  const heading_id = `token-${action}-confirmation`;

  useEffect(() => {
    confirm_button_ref.current?.focus();
  }, [action]);

  return (
    <div
      role="group"
      aria-labelledby={heading_id}
      className="mt-fc-24 rounded-fc-24 border border-fc-ink/24 bg-fc-panel-yellow p-fc-18"
    >
      <h4 id={heading_id} className="font-display text-fc-21 font-bold">
        {action === "rotate" ? "Replace this token?" : "Revoke this token?"}
      </h4>
      <p className="mt-fc-12 text-fc-14">
        {action === "rotate"
          ? "The old token will stop working immediately."
          : "The plugin will stop working until you create a new token."}
      </p>
      <div className="mt-fc-18 flex flex-wrap gap-fc-12">
        <Button
          ref={confirm_button_ref}
          type="button"
          size="sm"
          variant={action === "revoke" ? "destructive" : "default"}
          disabled={is_pending}
          onClick={onConfirm}
        >
          {is_pending ? "Updating…" : "Confirm"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={is_pending}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
