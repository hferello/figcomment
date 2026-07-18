import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/shared/brand-mark";
import { IllustrationSlot } from "@/components/shared/illustration-slot";
import { PageFrame } from "@/components/shared/page-frame";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

/**
 * Shared brand shell keeps signup and login visually consistent while forms stay focused.
 */
export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: AuthShellProps) {
  return (
    <PageFrame>
      <nav
        aria-label="Primary"
        className="mb-fc-48 flex items-center justify-between"
      >
        <BrandMark />
        <Link href="/" className="text-fc-14 underline underline-offset-4">
          Back home
        </Link>
      </nav>

      <div className="grid gap-fc-24 lg:grid-cols-2">
        <section className="rounded-fc-36 bg-fc-panel-lavender p-fc-24 md:p-fc-48">
          <p className="mt-fc-18 text-fc-12 font-medium uppercase tracking-widest">
            {eyebrow}
          </p>
          <h1 className="mt-fc-36 font-display text-fc-36 leading-none font-bold md:text-fc-48">
            {title}
          </h1>
          <p className="mt-fc-24 text-fc-18 leading-relaxed md:text-fc-21">
            {description}
          </p>
          <IllustrationSlot
            src="/illustrations/sort-trimmed.svg"
            alt="Illustration of a designer overwhelmed by feedback comments"
            caption="Welcome to a better designer"
            className="mt-fc-36"
          />
        </section>

        <section className="rounded-fc-36 bg-fc-panel-mint p-fc-24 md:p-fc-48">
          {children}
        </section>
      </div>
    </PageFrame>
  );
}
