import type { Metadata } from "next";
import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const metadata: Metadata = {
  title: "Forgot password",
};

export const unstable_instant = {
  prefetch: "static",
  samples: [
    { searchParams: { error: null } },
    { searchParams: { error: "recovery" } },
  ],
};

type ForgotPasswordPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your password."
      description="We will send a secure link so you can choose a new password and return to your profile."
    >
      <h2 className="font-display text-fc-36 font-bold">Forgot password</h2>
      <p className="mt-fc-12 mb-fc-24 text-fc-18 text-muted-foreground">
        Enter the email you used to sign up.
      </p>
      <Suspense fallback={null}>
        <ForgotPasswordRecoveryAlert searchParams={searchParams} />
      </Suspense>
      <ForgotPasswordForm />
    </AuthShell>
  );
}

async function ForgotPasswordRecoveryAlert({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  if (error !== "recovery") {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-fc-24">
      <AlertTitle>Reset link failed</AlertTitle>
      <AlertDescription>
        The link may have expired. Request a fresh reset email below.
      </AlertDescription>
    </Alert>
  );
}
