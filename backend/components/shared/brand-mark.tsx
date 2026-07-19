import Link from "next/link";
import { BrandLogo } from "@/components/shared/brand-logo";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <Link
      href="/"
      aria-label="Figcomment home"
      className={cn(
        "inline-flex min-w-0 shrink items-center gap-1.5 rounded-fc-24 font-sans text-[1.5rem] font-bold focus-visible:ring-[3px] focus-visible:ring-ring/24 focus-visible:outline-none md:gap-2 md:text-fc-36",
        className,
      )}
    >
      <BrandLogo className="h-[3rem] md:h-fc-72" />
      Figcomment
    </Link>
  );
}
