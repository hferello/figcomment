import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const metadata: Metadata = {
  title: "Log in",
};

// Validates that runtime searchParams stay behind Suspense for instant navigations.
export const unstable_instant = {
  prefetch: "static",
  samples: [
    {
      // Absent query param — normal login visit.
      searchParams: { error: null },
    },
    {
      // Failed email confirmation redirect from /auth/callback.
      searchParams: { error: "confirmation" },
    },
  ],
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

/**
 * Static auth chrome + form; confirmation errors stream from searchParams.
 */
export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Your feedback workflow is ready."
      description="Log in to update provider credentials or manage the token used by your Figma plugin."
    >
      <h2 className="font-display text-fc-36 font-bold">Log in</h2>
      <p className="mt-fc-12 mb-fc-24 text-fc-18 text-muted-foreground">
        Continue to your private Figcomment profile.
      </p>
      <Suspense fallback={null}>
        <LoginConfirmationAlert searchParams={searchParams} />
      </Suspense>
      <LoginForm />
    </AuthShell>
  );
}

/**
 * Reads URL searchParams at request time so the login shell can prerender.
 */
async function LoginConfirmationAlert({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  if (error !== "confirmation") {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-fc-24">
      <AlertTitle>Confirmation link failed</AlertTitle>
      <AlertDescription>
        The link may have expired. Create the account again to request a fresh email.
      </AlertDescription>
    </Alert>
  );
}
