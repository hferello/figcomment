"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type SignOutButtonProps = {
  email?: string | null;
};

export function SignOutButton({ email = null }: SignOutButtonProps) {
  const router = useRouter();
  const [error_message, setErrorMessage] = useState<string | null>(null);
  const [is_pending, startTransition] = useTransition();

  function handleSignOut() {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        const supabase = createClient();
        const { error } = await supabase.auth.signOut();

        if (error) {
          console.error("[SignOutButton] sign_out_failed", error);
          setErrorMessage("Could not sign out. Please try again.");
          return;
        }

        router.replace("/login");
        router.refresh();
      } catch (error) {
        console.error("[SignOutButton] unexpected_error", error);
        setErrorMessage("Could not sign out. Please try again.");
      }
    });
  }

  return (
    <div className="flex flex-col items-stretch gap-fc-12 md:items-end">
      <div className="flex flex-wrap items-center justify-end gap-fc-18">
        {email ? (
          <p className="max-w-full truncate text-fc-14 text-muted-foreground">
            {email}
          </p>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={is_pending}
          onClick={handleSignOut}
        >
          {is_pending ? "Signing out…" : "Sign out"}
        </Button>
      </div>
      {error_message ? (
        <p role="alert" className="text-fc-12 text-destructive">
          {error_message}
        </p>
      ) : null}
    </div>
  );
}
