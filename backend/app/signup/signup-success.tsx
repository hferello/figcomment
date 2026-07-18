"use client";

import Link from "next/link";

type SignupSuccessProps = {
  email: string;
  onTryAgain: () => void;
};

/**
 * Post-signup confirmation prompt. Only the retry action needs client interactivity.
 */
export function SignupSuccess({ email, onTryAgain }: SignupSuccessProps) {
  return (
    <div>
      <h2 className="font-display text-fc-36 font-bold">Check your inbox</h2>
      <p className="mt-fc-12 text-fc-18 text-muted-foreground">
        We sent a confirmation link to{" "}
        <span className="font-medium text-fc-ink">{email}</span>. Open it to
        finish creating your account, then log in to set up your profile.
      </p>
      <p className="mt-fc-24 text-fc-14 text-muted-foreground">
        Did not get the email? Check spam, or{" "}
        <button
          type="button"
          className="font-medium text-fc-ink underline underline-offset-4"
          onClick={onTryAgain}
        >
          try again
        </button>
        .
      </p>
      <p className="mt-fc-24 text-center text-fc-14 text-muted-foreground">
        Already confirmed?{" "}
        <Link
          href="/login"
          className="font-medium text-fc-ink underline underline-offset-4"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
