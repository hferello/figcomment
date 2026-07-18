import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Reset password",
};

export const unstable_instant = {
  prefetch: "static",
};

/**
 * Static auth chrome; recovery session gate streams behind Suspense.
 */
export default function ResetPasswordPage() {
  return (
    <AuthShell
      eyebrow="Almost done"
      title="Choose a new password."
      description="Your recovery link worked. Set a new password to continue using Figcomment."
    >
      <h2 className="font-display text-fc-36 font-bold">Reset password</h2>
      <p className="mt-fc-12 mb-fc-24 text-fc-18 text-muted-foreground">
        Use at least 8 characters.
      </p>
      <Suspense fallback={<ResetPasswordFallback />}>
        <ResetPasswordGate />
      </Suspense>
    </AuthShell>
  );
}

async function ResetPasswordGate() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/forgot-password?error=recovery");
  }

  return <ResetPasswordForm />;
}

function ResetPasswordFallback() {
  return (
    <div aria-busy="true" aria-label="Loading reset form">
      <div className="h-fc-96 animate-pulse rounded-fc-24 bg-fc-ink/12" />
      <p className="sr-only">Loading password reset form.</p>
    </div>
  );
}
