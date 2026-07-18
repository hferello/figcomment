"use client";

import { useState, type ReactNode } from "react";
import { SignupForm } from "@/app/signup/signup-form";
import { SignupSuccess } from "@/app/signup/signup-success";

type SignupPanelProps = {
  children: ReactNode;
};

/**
 * Client island that swaps the signup form for the email-confirmation success view.
 */
export function SignupPanel({ children }: SignupPanelProps) {
  const [confirmed_email, setConfirmedEmail] = useState<string | null>(null);

  if (confirmed_email !== null) {
    return (
      <SignupSuccess
        email={confirmed_email}
        onTryAgain={() => setConfirmedEmail(null)}
      />
    );
  }

  return (
    <>
      {children}
      <SignupForm onEmailConfirmationRequired={setConfirmedEmail} />
    </>
  );
}
