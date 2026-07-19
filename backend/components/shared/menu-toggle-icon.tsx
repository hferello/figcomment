import { cn } from "@/lib/utils";

type MenuToggleIconProps = {
  isOpen: boolean;
  className?: string;
};

/**
 * Two-line menu icon that animates into an X when open.
 */
export function MenuToggleIcon({ isOpen, className }: MenuToggleIconProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("relative block size-fc-18", className)}
    >
      <span
        className={cn(
          "absolute left-1/2 h-[2px] w-fc-18 -translate-x-1/2 rounded-full bg-current transition-transform duration-200 ease-out motion-reduce:transition-none",
          isOpen
            ? "top-1/2 -translate-y-1/2 rotate-45"
            : "top-[4px] rotate-0",
        )}
      />
      <span
        className={cn(
          "absolute left-1/2 h-[2px] w-fc-18 -translate-x-1/2 rounded-full bg-current transition-transform duration-200 ease-out motion-reduce:transition-none",
          isOpen
            ? "top-1/2 -translate-y-1/2 -rotate-45"
            : "bottom-[4px] rotate-0",
        )}
      />
    </span>
  );
}
