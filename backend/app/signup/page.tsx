import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupPanel } from "@/app/signup/signup-panel";

export const metadata: Metadata = {
  title: "Create account",
};

// Validates that this public route remains an instant static shell.
export const unstable_instant = {
  prefetch: "static",
};

export default function SignupPage() {
  return (
    <AuthShell
      eyebrow="Start sorting the signal"
      title="Turn comment chaos into clear action."
      description="Create an account, connect your own provider keys, and give the Figma plugin one secure token."
    >
      <SignupPanel>
        <h2 className="font-display text-fc-36 font-bold">Create your account</h2>
        <p className="mt-fc-12 mb-fc-24 text-fc-18 text-muted-foreground">
          Enter your email and password. We will send a confirmation link to finish
          setup.
        </p>
      </SignupPanel>
    </AuthShell>
  );
}
