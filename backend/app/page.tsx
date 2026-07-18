import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { BrandMark } from "@/components/shared/brand-mark";
import { IllustrationSlot } from "@/components/shared/illustration-slot";
import { PageFrame } from "@/components/shared/page-frame";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

// Validates that this public route remains an instant static shell.
export const unstable_instant = {
  prefetch: "static",
};

export default function HomePage() {
  return (
    <PageFrame>
      <nav
        aria-label="Primary"
        className="flex items-center justify-between gap-fc-18"
      >
        <BrandMark />
        <Suspense fallback={<HomeNavActionsFallback />}>
          <HomeNavActions />
        </Suspense>
      </nav>

      <section className="grid gap-fc-24 py-fc-48 lg:grid-cols-2 lg:py-fc-72">
        <div className="rounded-fc-36 bg-fc-panel-cyan p-fc-24 md:p-fc-48">
          <p className="mt-fc-18 text-fc-12 font-medium uppercase tracking-widest">
            Feedback, with a next step
          </p>
          <h1 className="mt-fc-36 font-display text-fc-48 leading-none font-bold md:text-fc-63">
            Sort the signal from your Figma comments.
          </h1>
          <p className="mt-fc-24 text-fc-18 leading-relaxed md:text-fc-21">
            Figcomment analyses, groups, and turns scattered design feedback
            into clear actions without copying comments into a permanent
            database.
          </p>
          <Suspense fallback={<HomeHeroActionsFallback />}>
            <HomeHeroActions />
          </Suspense>
        </div>

        <div className="rounded-fc-36 bg-fc-panel-mint p-fc-24 md:p-fc-36">
          <IllustrationSlot
            src="/illustrations/overwhelmed.svg"
            alt="Illustration of a designer overwhelmed by feedback comments"
            caption="Too many comments to sort through"
          />
        </div>
      </section>

      <section aria-labelledby="how-it-works" className="pb-fc-48 lg:pb-fc-72">
        <div className="mb-fc-24">
          <p className="text-fc-12 font-medium uppercase tracking-widest">
            Three calm steps
          </p>
          <h2
            id="how-it-works"
            className="mt-fc-12 font-display text-fc-48 leading-none font-bold"
          >
            Connect once. Analyse from Figma.
          </h2>
        </div>

        <ol className="grid gap-fc-24 lg:grid-cols-3">
          <li className="relative gap-fc-18 rounded-fc-36 bg-fc-panel-peach p-fc-24 md:gap-fc-24 md:p-fc-36">
            <span className="text-fc-72">01</span>
            <h3 className="mt-fc-18 font-display text-fc-36 leading-none font-bold">
              Save your keys
            </h3>
            <p className="mt-fc-18 text-fc-18 leading-relaxed">
              Add your Figma PAT and Anthropic key. Both are encrypted before
              storage.
            </p>

            <Image
              src="/illustrations/keys.svg"
              alt="A person holding a key"
              width={128}
              height={128}
              aria-hidden
              className="shrink-0 absolute top-4 right-4"
            />
          </li>
          <li className="relative gap-fc-18 rounded-fc-36 bg-fc-panel-lavender p-fc-24 md:gap-fc-24 md:p-fc-36">
            <span className="text-fc-72">02</span>
            <h3 className="mt-fc-18 font-display text-fc-36 leading-none font-bold">
              Copy one token
            </h3>
            <p className="mt-fc-18 text-fc-18 leading-relaxed">
              Generate a copy-once plugin token. The server stores only its
              secure hash.
            </p>
            <Image
              src="/illustrations/token.svg"
              alt="A person holding a token"
              width={128}
              height={128}
              aria-hidden
              className="shrink-0 absolute top-4 right-4"
            />
          </li>
          <li className="relative gap-fc-18 rounded-fc-36 bg-fc-panel-cyan p-fc-24 md:gap-fc-24 md:p-fc-36">
            <span className="text-fc-72">03</span>
            <h3 className="mt-fc-18 font-display text-fc-36 leading-none font-bold">
              Sort the feedback
            </h3>
            <p className="mt-fc-18 text-fc-18 leading-relaxed">
              Run Figcomment inside Figma and turn comment noise into useful
              groups and actions.
            </p>
            <Image
              src="/illustrations/sort.svg"
              alt="A person sorting speech bubbles"
              width={128}
              height={128}
              aria-hidden
              className="shrink-0 absolute top-4 right-4"
            />
          </li>
        </ol>
      </section>

      <footer className="flex flex-col gap-fc-18 border-t border-fc-ink/24 pt-fc-24 text-fc-14 md:flex-row md:items-center md:justify-between">
        <p>Figcomment — make feedback actionable.</p>
        <a
          href="https://github.com/hferello/figcomment"
          className="underline underline-offset-4"
        >
          View on GitHub
        </a>
      </footer>
    </PageFrame>
  );
}

/**
 * Session-aware nav actions. Logged-in users go straight to profile setup.
 */
async function HomeNavActions() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return (
      <div className="flex items-center gap-fc-12">
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
    );
  }

  return (
    <div className="flex items-center gap-fc-12">
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
  );
}

function HomeNavActionsFallback() {
  return (
    <div aria-hidden="true" className="flex items-center gap-fc-12">
      <div className="h-fc-48 w-fc-96 animate-pulse rounded-fc-36 bg-fc-ink/12" />
      <div className="h-fc-48 w-fc-96 animate-pulse rounded-fc-36 bg-fc-ink/12" />
    </div>
  );
}

/**
 * Session-aware hero CTAs mirror the nav: setup for signed-in users, auth for guests.
 */
async function HomeHeroActions() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return (
      <div className="mt-fc-36 flex flex-wrap gap-fc-12">
        <Link
          href="/profile"
          className={cn(
            buttonVariants({ size: "lg" }),
            "bg-fc-ink text-white hover:bg-fc-ink/80",
          )}
        >
          Go to setup
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-fc-36 flex flex-wrap gap-fc-12">
      <Link
        href="/signup"
        className={cn(
          buttonVariants({ size: "lg" }),
          "bg-fc-ink text-white hover:bg-fc-ink/80",
        )}
      >
        Create an account
      </Link>
      <Link
        href="/login"
        className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
      >
        Log in
      </Link>
    </div>
  );
}

function HomeHeroActionsFallback() {
  return (
    <div aria-hidden="true" className="mt-fc-36 flex flex-wrap gap-fc-12">
      <div className="h-fc-48 w-fc-96 animate-pulse rounded-fc-36 bg-fc-ink/12" />
      <div className="h-fc-48 w-fc-96 animate-pulse rounded-fc-36 bg-fc-ink/12" />
    </div>
  );
}
