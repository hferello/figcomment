"use client";

import { MenuToggleIcon } from "@/components/shared/menu-toggle-icon";
import { Button } from "@/components/ui/button";
import { SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type MobileNavSheetTriggerProps = {
  isOpen: boolean;
  openLabel: string;
  closeLabel: string;
  className?: string;
};

/**
 * Borderless mobile menu trigger with animated two-line icon.
 */
export function MobileNavSheetTrigger({
  isOpen,
  openLabel,
  closeLabel,
  className,
}: MobileNavSheetTriggerProps) {
  return (
    <SheetTrigger
      render={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "rounded-fc-36 border-transparent md:hidden",
            className,
          )}
          aria-label={isOpen ? closeLabel : openLabel}
          aria-expanded={isOpen}
        />
      }
    >
      <MenuToggleIcon isOpen={isOpen} />
    </SheetTrigger>
  );
}
