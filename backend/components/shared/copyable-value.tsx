"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CopyableValueProps = {
  value: string;
  label: string;
  button_label?: string;
  success_message?: string;
  error_message?: string;
  className?: string;
};

/**
 * Displays a value with resilient clipboard copy feedback.
 * Suitable for tokens, IDs, commands, and other manually copyable values.
 */
export function CopyableValue({
  value,
  label,
  button_label = "Copy",
  success_message = "Copied to your clipboard.",
  error_message = "Clipboard access failed. Select and copy the value manually.",
  className,
}: CopyableValueProps) {
  const [copy_message, setCopyMessage] = useState<string | null>(null);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(success_message);
    } catch (error) {
      console.error("[CopyableValue] copy_failed", error);
      setCopyMessage(error_message);
    }
  }

  return (
    <div
      className={cn(
        "rounded-fc-24 border border-fc-ink bg-fc-panel-yellow p-fc-18",
        className,
      )}
    >
      <p className="text-fc-12 font-medium uppercase tracking-widest">{label}</p>
      <output className="mt-fc-12 block break-all font-mono text-fc-14">{value}</output>
      <Button type="button" size="sm" className="mt-fc-18" onClick={handleCopy}>
        {button_label}
      </Button>
      {copy_message ? (
        <p role="status" className="mt-fc-12 text-fc-12">
          {copy_message}
        </p>
      ) : null}
    </div>
  );
}
