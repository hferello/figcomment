"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MobileNavSheetTrigger } from "@/components/shared/mobile-nav-sheet-trigger";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";

type SignOutButtonProps = {
  email?: string | null;
};

export function SignOutButton({ email = null }: SignOutButtonProps) {
  const router = useRouter();
  const [error_message, setErrorMessage] = useState<string | null>(null);
  const [is_sheet_open, setIsSheetOpen] = useState(false);
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

        setIsSheetOpen(false);
        router.replace("/login");
        router.refresh();
      } catch (error) {
        console.error("[SignOutButton] unexpected_error", error);
        setErrorMessage("Could not sign out. Please try again.");
      }
    });
  }

  const error_alert = error_message ? (
    <p role="alert" className="text-fc-12 text-destructive">
      {error_message}
    </p>
  ) : null;

  return (
    <div className="flex shrink-0 flex-col items-end gap-fc-12">
      <div className="hidden items-center gap-fc-18 md:flex">
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

      <Sheet open={is_sheet_open} onOpenChange={setIsSheetOpen}>
        <MobileNavSheetTrigger
          isOpen={is_sheet_open}
          openLabel="Open account menu"
          closeLabel="Close account menu"
        />
        <SheetContent
          side="right"
          showCloseButton={false}
          className="px-fc-24 pb-fc-24 pt-26"
        >
          <SheetHeader>
            <SheetTitle>Account</SheetTitle>
            <SheetDescription>
              Signed in as {email ?? "your account"}.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-fc-12">
            {email ? (
              <p className="truncate text-fc-14 text-muted-foreground">
                {email}
              </p>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full rounded-fc-36"
              disabled={is_pending}
              onClick={handleSignOut}
            >
              {is_pending ? "Signing out…" : "Sign out"}
            </Button>
            {error_alert}
          </div>
        </SheetContent>
      </Sheet>

      <div className="hidden md:block">{error_alert}</div>
    </div>
  );
}
