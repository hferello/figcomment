"use client";

import { useEffect } from "react";
import { PageFrame } from "@/components/shared/page-frame";
import { Button } from "@/components/ui/button";

type ProfileErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ProfileError({ error, reset }: ProfileErrorProps) {
  useEffect(() => {
    console.error("[ProfileError] route_failed", error);
  }, [error]);

  return (
    <PageFrame className="flex items-center py-fc-48">
      <section className="w-full rounded-fc-36 bg-fc-panel-pink p-fc-24 md:p-fc-48">
        <p className="text-fc-12 font-medium uppercase tracking-widest">Profile unavailable</p>
        <h1 className="mt-fc-12 font-display text-fc-48 leading-none font-bold">
          We could not load your setup.
        </h1>
        <p className="mt-fc-24 text-fc-18">
          Try the request again. Your saved credentials and token have not been changed.
        </p>
        <Button type="button" size="lg" className="mt-fc-24" onClick={reset}>
          Try again
        </Button>
      </section>
    </PageFrame>
  );
}
