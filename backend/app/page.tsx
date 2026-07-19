import Link from "next/link";
import { Suspense } from "react";
import { HomeNavActionsMenu } from "@/components/home/home-nav-actions-menu";
import { MenuToggleIcon } from "@/components/shared/menu-toggle-icon";
import { BrandMark } from "@/components/shared/brand-mark";
import { FigmaPluginGuideDialog } from "@/components/profile/figma-plugin-guide-dialog";
import { FigmaTokenGuideDialog } from "@/components/profile/figma-token-guide-dialog";
import { HowItWorksSteps } from "@/components/shared/how-it-works-steps";
import { IllustrationSlot } from "@/components/shared/illustration-slot";
import { PageFrame } from "@/components/shared/page-frame";
import { Button, buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import {
  getPluginDownloadFilename,
  getPluginDownloadHref,
  readPluginVersion,
} from "@/lib/plugin-download/plugin-version";
import { cn } from "@/lib/utils";

// Validates that this public route remains an instant static shell.
export const unstable_instant = {
  prefetch: "static",
};

const plugin_version = readPluginVersion();
const plugin_download_href = getPluginDownloadHref();
const plugin_download_filename = getPluginDownloadFilename(plugin_version);

export default function HomePage() {
  return (
    <PageFrame>
      <nav
        aria-label="Primary"
        className="relative z-50 flex items-center justify-between gap-fc-12 md:gap-fc-18"
      >
        <BrandMark className="min-w-0" />
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
            Connect once. Start sorting.
          </h2>
        </div>

        <HowItWorksSteps
          steps={[
            {
              step: "01",
              title: "Save your keys",
              description:
                "Add your Figma PAT and Anthropic key. Both are encrypted before storage.",
              tone: "peach",
              illustration: {
                src: "/illustrations/keys.svg",
                alt: "A person holding a key",
              },
            },
            {
              step: "02",
              title: "Copy one token",
              description:
                "Generate a copy-once plugin token. The server stores only its secure hash.",
              tone: "lavender",
              illustration: {
                src: "/illustrations/token.svg",
                alt: "A person holding a token",
              },
            },
            {
              step: "03",
              title: "Sort the feedback",
              description:
                "Run Figcomment inside Figma and turn comment noise into useful groups and actions.",
              tone: "cyan",
              illustration: {
                src: "/illustrations/sort.svg",
                alt: "A person sorting speech bubbles",
              },
            },
          ]}
        />
      </section>

      <section aria-labelledby="how-it-works" className="pb-fc-48 lg:pb-fc-72">
        <div className="mb-fc-24">
          <p className="text-fc-12 font-medium uppercase tracking-widest">
            What do to first
          </p>
          <h2
            id="how-it-works"
            className="mt-fc-12 font-display text-fc-48 leading-none font-bold"
          >
            How to get started
          </h2>
        </div>

        <HowItWorksSteps
          steps={[
            {
              step: "x",
              title: "Sign up for an account",
              description: "Create an account to save your keys and tokens.",
              tone: "gray",
            },
            {
              step: "xx",
              title: "Add your keys",
              description: (
                <>
                  Add your{" "}
                  <FigmaTokenGuideDialog triggerClassName="inline align-baseline font-medium underline underline-offset-4 hover:text-fc-ink/80">
                    Figma PAT
                  </FigmaTokenGuideDialog>{" "}
                  and{" "}
                  <a
                    href="https://www.merge.dev/blog/anthropic-api-key"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline underline-offset-4 hover:text-fc-ink/80"
                  >
                    Anthropic key
                  </a>
                  . Both are encrypted before storage.
                </>
              ),
              tone: "gray",
            },
            {
              step: "xxx",
              title: "Download the plugin",
              description: (
                <>
                  <a
                    href={plugin_download_href}
                    download={plugin_download_filename}
                    className="font-medium underline underline-offset-4 hover:text-fc-ink/80"
                  >
                    Download the plugin
                  </a>
                  , unzip it, then{" "}
                  <FigmaPluginGuideDialog triggerClassName="inline align-baseline font-medium underline underline-offset-4 hover:text-fc-ink/80">
                    import it in Figma
                  </FigmaPluginGuideDialog>
                  .
                </>
              ),
              tone: "gray",
            },
          ]}
        />
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

  return <HomeNavActionsMenu isLoggedIn={Boolean(user)} />;
}

function HomeNavActionsFallback() {
  return (
    <div aria-hidden="true" className="flex items-center gap-fc-12">
      <div className="hidden h-fc-48 w-fc-96 animate-pulse rounded-fc-36 bg-fc-ink/12 md:block" />
      <div className="hidden h-fc-48 w-fc-96 animate-pulse rounded-fc-36 bg-fc-ink/12 md:block" />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="rounded-fc-36 border-transparent md:hidden"
        disabled
        aria-hidden="true"
        tabIndex={-1}
      >
        <MenuToggleIcon isOpen={false} className="opacity-48" />
      </Button>
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
          Go to account
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
