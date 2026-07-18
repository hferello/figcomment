"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
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
    <div>
      <Button type="button" variant="outline" disabled={is_pending} onClick={handleSignOut}>
        {is_pending ? "Signing out…" : "Sign out"}
      </Button>
      {error_message ? (
        <p role="alert" className="mt-fc-12 text-fc-12 text-destructive">
          {error_message}
        </p>
      ) : null}
    </div>
  );
}
