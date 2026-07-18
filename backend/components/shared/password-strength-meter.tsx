"use client";

import { useEffect, useState, useDeferredValue } from "react";
import {
  estimatePasswordStrength,
  getPasswordStrengthLabel,
  isPasswordStrengthScore,
  type PasswordStrengthLabel,
  type PasswordStrengthScore,
} from "@/lib/password-strength";
import { cn } from "@/lib/utils";

type PasswordStrengthMeterProps = {
  password: string;
  /** Email (or similar) so zxcvbn can flag personal data as a weak pattern. */
  email?: string;
  id: string;
};

type StrengthPresentation = {
  score: PasswordStrengthScore;
  label: PasswordStrengthLabel;
  tip: string | null;
};

/**
 * Classic strength ramp: red → orange → green. Label text still carries meaning
 * so strength is never color-only (WCAG).
 */
const SEGMENT_FILL: Record<PasswordStrengthScore, string> = {
  0: "bg-[#c0392b]",
  1: "bg-[#e67e22]",
  2: "bg-[#f39c12]",
  3: "bg-[#27ae60]",
  4: "bg-[#1e8449]",
};

const SEGMENT_COUNT = 5;

/**
 * Real-time signup strength meter: 5 segments + plain-language label + optional tip.
 * Announces only when the strength label changes (not every keystroke).
 */
export function PasswordStrengthMeter({
  password,
  email = "",
  id,
}: PasswordStrengthMeterProps) {
  const deferred_password = useDeferredValue(password);
  const deferred_email = useDeferredValue(email.trim());
  const [presentation, setPresentation] = useState<StrengthPresentation | null>(
    null,
  );
  const [live_label, setLiveLabel] = useState("");

  useEffect(() => {
    if (deferred_password.length === 0) {
      setPresentation(null);
      setLiveLabel("");
      return;
    }

    let is_cancelled = false;
    const user_inputs = deferred_email.length > 0 ? [deferred_email] : [];

    void estimatePasswordStrength(deferred_password, user_inputs).then(
      (result) => {
        if (is_cancelled || !isPasswordStrengthScore(result.score)) {
          return;
        }

        const label = getPasswordStrengthLabel(result.score);
        const warning = result.feedback.warning?.trim() ?? "";
        const first_suggestion = result.feedback.suggestions[0]?.trim() ?? "";
        const tip = warning || first_suggestion || null;

        setPresentation({ score: result.score, label, tip });
        setLiveLabel((previous_label) =>
          previous_label === label ? previous_label : label,
        );
      },
    );

    return () => {
      is_cancelled = true;
    };
  }, [deferred_password, deferred_email]);

  if (password.length === 0) {
    return null;
  }

  const active_score = presentation?.score ?? 0;
  const visible_label = presentation?.label ?? "Checking…";
  const tip = presentation?.tip ?? null;
  // Score 0–4 maps to 1–5 filled segments so each level is visually distinct.
  const filled_count = active_score + 1;

  return (
    <div id={id} className="flex flex-col gap-fc-12">
      <div
        className="grid grid-cols-5 gap-fc-12"
        aria-hidden="true"
        role="presentation"
      >
        {Array.from({ length: SEGMENT_COUNT }, (_, segment_index) => {
          const is_filled = segment_index < filled_count;
          return (
            <span
              key={segment_index}
              className={cn(
                "h-fc-12 rounded-fc-24 transition-colors duration-200",
                is_filled ? SEGMENT_FILL[active_score] : "bg-muted",
              )}
            />
          );
        })}
      </div>

      <p className="text-fc-14 text-fc-ink">
        Strength: <span className="font-medium">{visible_label}</span>
      </p>

      {tip ? (
        <p className="text-fc-14 leading-normal text-muted-foreground">{tip}</p>
      ) : null}

      {/* Polite live region: only updates when the strength label changes. */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {live_label ? `Password strength: ${live_label}` : ""}
      </p>
    </div>
  );
}
