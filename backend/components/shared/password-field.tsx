"use client";

import { useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordFieldProps = Omit<ComponentProps<typeof Input>, "type">;

/**
 * Password input with a visible, keyboard-accessible disclosure control.
 */
export function PasswordField({
  className,
  id,
  ...input_props
}: PasswordFieldProps) {
  const [is_visible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...input_props}
        id={id}
        type={is_visible ? "text" : "password"}
        className={cn("pr-fc-96", className)}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-controls={id}
        aria-label={is_visible ? "Hide password" : "Show password"}
        aria-pressed={is_visible}
        className="absolute inset-y-0 right-fc-12 my-auto"
        onClick={() => setIsVisible((current_value) => !current_value)}
      >
        {is_visible ? "Hide" : "Show"}
      </Button>
    </div>
  );
}
