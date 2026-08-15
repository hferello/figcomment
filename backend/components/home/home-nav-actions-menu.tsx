"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { MobileNavSheetTrigger } from "@/components/shared/mobile-nav-sheet-trigger";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { app_constants } from "@/data/constants";
import { cn } from "@/lib/utils";

type HomeNavActionsMenuProps = {
  isLoggedIn: boolean;
};

type MobileNavSheetProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  openLabel: string;
  closeLabel: string;
  title: string;
  description: string;
  children: ReactNode;
};

function MobileNavSheet({
  isOpen,
  onOpenChange,
  openLabel,
  closeLabel,
  title,
  description,
  children,
}: MobileNavSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <MobileNavSheetTrigger
        isOpen={isOpen}
        openLabel={openLabel}
        closeLabel={closeLabel}
      />
      <SheetContent
        side="right"
        showCloseButton={false}
        className="px-fc-24 pb-fc-24 pt-26"
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}

/**
 * Responsive home nav: inline buttons on desktop, full-screen sheet on mobile.
 */
export function HomeNavActionsMenu({ isLoggedIn }: HomeNavActionsMenuProps) {
  const [is_sheet_open, setIsSheetOpen] = useState(false);

  if (isLoggedIn) {
    return (
      <div className="flex shrink-0 items-center gap-fc-12">
        <div className="hidden items-center gap-fc-12 md:flex">
          <Link
            href="/profile"
            className={cn(
              buttonVariants({ size: "lg" }),
              "rounded-fc-36 bg-fc-ink text-white hover:bg-fc-ink/80",
            )}
          >
            Account
          </Link>
        </div>

        <MobileNavSheet
          isOpen={is_sheet_open}
          onOpenChange={setIsSheetOpen}
          openLabel="Open account menu"
          closeLabel="Close account menu"
          title="Account"
          description={`Manage your ${app_constants.backend.title} setup and credentials.`}
        >
          <nav aria-label="Account" className="flex flex-col gap-fc-12">
            <SheetClose
              render={
                <Link
                  href="/profile"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "w-full rounded-fc-36 bg-fc-ink text-white hover:bg-fc-ink/80",
                  )}
                />
              }
            >
              Go to account
            </SheetClose>
          </nav>
        </MobileNavSheet>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-fc-12">
      <div className="hidden items-center gap-fc-12 md:flex">
        <Link
          href="/login"
          className={cn(
            buttonVariants({ variant: "ghost", size: "lg" }),
            "rounded-fc-36",
          )}
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className={cn(
            buttonVariants({ size: "lg" }),
            "rounded-fc-36 bg-fc-ink text-white hover:bg-fc-ink/80",
          )}
        >
          Get started
        </Link>
      </div>

      <MobileNavSheet
        isOpen={is_sheet_open}
        onOpenChange={setIsSheetOpen}
        openLabel="Open menu"
        closeLabel="Close menu"
        title="Menu"
        description={`Sign in or create an account to connect ${app_constants.backend.title}.`}
      >
        <nav aria-label="Authentication" className="flex flex-col gap-fc-12">
          <SheetClose
            render={
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "w-full rounded-fc-36 bg-fc-ink text-white hover:bg-fc-ink/80",
                )}
              />
            }
          >
            Get started
          </SheetClose>
          <SheetClose
            render={
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "w-full rounded-fc-36",
                )}
              />
            }
          >
            Log in
          </SheetClose>
        </nav>
      </MobileNavSheet>
    </div>
  );
}
