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
        "inline-flex rounded-fc-24 focus-visible:ring-[3px] focus-visible:ring-ring/24 focus-visible:outline-none font-sans text-fc-36 font-bold items-center gap-2",
        className,
      )}
    >
      <BrandLogo />
      Figcomment
    </Link>
  );
}
