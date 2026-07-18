import Image from "next/image";
import Link from "next/link";
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
        "inline-flex rounded-fc-24 focus-visible:ring-[3px] focus-visible:ring-ring/24 focus-visible:outline-none font-display text-fc-36 font-bold items-center gap-2",
        className,
      )}
    >
      <Image
        src="/figcomment-logo.svg"
        alt=""
        width={96}
        height={96}
        className="h-fc-96 w-auto"
      />
      Figcomment
    </Link>
  );
}
