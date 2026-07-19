import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DeleteAccountSection } from "@/components/profile/delete-account-section";
import { PluginTokenSection } from "@/components/profile/plugin-token-section";
import { ProfileSignOut } from "@/components/profile/profile-sign-out";
import { SecretsSection } from "@/components/profile/secrets-section";
import { SignOutButton } from "@/components/profile/sign-out-button";
import { BrandMark } from "@/components/shared/brand-mark";
import { PageFrame } from "@/components/shared/page-frame";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getActivePluginTokenMetadata } from "@/lib/plugin-tokens/service";
import { createClient } from "@/lib/supabase/server";
import { getSecretStatus } from "@/lib/user-secrets/service";

export const metadata: Metadata = {
  title: "Profile",
};

// Validates that cookie-bound private data stays behind Suspense for instant navigations.
export const unstable_instant = {
  prefetch: "static",
};

/**
 * Static setup chrome with a Suspense boundary for session-bound private data.
 * User secrets and plugin tokens must never use shared `use cache`.
 */
export default function ProfilePage() {
  return (
    <PageFrame>
      <header className="relative z-50 mb-fc-48 flex items-center justify-between gap-fc-18">
        <BrandMark />
        <Suspense fallback={<SignOutButton />}>
          <ProfileSignOut />
        </Suspense>
      </header>

      <section className="mb-fc-24 rounded-fc-36 bg-fc-panel-lavender p-fc-24 md:p-fc-48">
        <p className="text-fc-12 font-medium uppercase tracking-widest">
          Your setup
        </p>
        <h1 className="mt-fc-12 font-display text-fc-48 leading-none font-bold md:text-fc-63">
          Figcomment setup.
        </h1>
        <p className="mt-fc-24 text-fc-18 leading-relaxed md:text-fc-21">
          Save provider credentials, create one plugin token, then continue
          setup inside Figma.
        </p>
      </section>

      <Suspense fallback={<ProfilePrivateFallback />}>
        <ProfilePrivateData />
      </Suspense>
    </PageFrame>
  );
}

/**
 * Request-time session + per-user credential/token status. Kept uncached on purpose.
 */
async function ProfilePrivateData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Independent server reads; failures reach error.tsx instead of empty UI.
  const [secret_status, token_metadata] = await Promise.all([
    getSecretStatus(user.id),
    getActivePluginTokenMetadata(user.id),
  ]);

  const is_email_confirmed = Boolean(user.email_confirmed_at);

  return (
    <>
      {!is_email_confirmed ? (
        <Alert className="mb-fc-24">
          <AlertTitle>Email confirmation required</AlertTitle>
          <AlertDescription>
            Check your inbox and confirm {user.email ?? "your account email"}{" "}
            before saving keys or creating a plugin token.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-fc-24">
        <SecretsSection
          initial_status={secret_status}
          is_email_confirmed={is_email_confirmed}
        />
        <PluginTokenSection
          initial_metadata={token_metadata}
          secret_status={secret_status}
          is_email_confirmed={is_email_confirmed}
        />
        {user.email ? (
          <DeleteAccountSection account_email={user.email} />
        ) : null}
      </div>
    </>
  );
}

function ProfilePrivateFallback() {
  return (
    <div aria-busy="true" aria-label="Loading profile data">
      <div className="grid gap-fc-24">
        <div className="h-fc-96 animate-pulse rounded-fc-36 bg-fc-panel-cyan" />
        <div className="h-fc-96 animate-pulse rounded-fc-36 bg-fc-panel-mint" />
      </div>
      <p className="sr-only">
        Loading your credentials and plugin token status.
      </p>
    </div>
  );
}
