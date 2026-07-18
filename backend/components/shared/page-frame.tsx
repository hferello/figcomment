import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function PageFrame({ className, ...props }: ComponentProps<"main">) {
  return (
    <main
      className={cn(
        "min-h-screen bg-fc-bg px-fc-24 py-fc-24 md:px-fc-48 md:py-fc-48",
        className,
      )}
      {...props}
    />
  );
}
