import { BrandMark } from "@/components/shared/brand-mark";
import { PageFrame } from "@/components/shared/page-frame";

/**
 * Route-level fallback while navigating to /profile.
 * Matches the static shell + private-data skeleton used by the page Suspense boundary.
 */
export default function ProfileLoading() {
  return (
    <PageFrame aria-busy="true" aria-label="Loading profile">
      <header className="mb-fc-48">
        <BrandMark />
      </header>

      <section className="mb-fc-24 rounded-fc-36 bg-fc-panel-yellow p-fc-24 md:p-fc-48">
        <p className="text-fc-12 font-medium uppercase tracking-widest">Your setup</p>
        <h1 className="mt-fc-12 font-display text-fc-48 leading-none font-bold md:text-fc-63">
          Figcomment setup.
        </h1>
        <p className="mt-fc-24 text-fc-18 leading-relaxed md:text-fc-21">
          Save provider credentials, create one plugin token, then continue setup inside Figma.
        </p>
      </section>

      <div>
        <div className="mb-fc-24 h-fc-14 w-fc-96 animate-pulse rounded-fc-24 bg-fc-ink/12" />
        <div className="grid gap-fc-24">
          <div className="h-fc-96 animate-pulse rounded-fc-36 bg-fc-panel-blue" />
          <div className="h-fc-96 animate-pulse rounded-fc-36 bg-fc-panel-pink" />
        </div>
      </div>
      <p className="sr-only">Loading your credentials and plugin token status.</p>
    </PageFrame>
  );
}
