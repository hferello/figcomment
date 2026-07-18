import type { ReactNode } from "react";
import { IllustrationSlot } from "@/components/shared/illustration-slot";
import { cn } from "@/lib/utils";

type PanelTone = "cyan" | "mint" | "lavender" | "peach";

type ProfileFeaturePanelProps = {
  tone: PanelTone;
  eyebrow: string;
  title: string;
  description: string;
  illustration: {
    src: string;
    alt: string;
    caption: string;
  };
  children: ReactNode;
};

const tone_classes: Record<PanelTone, string> = {
  cyan: "bg-fc-panel-cyan",
  mint: "bg-fc-panel-mint",
  lavender: "bg-fc-panel-lavender",
  peach: "bg-fc-panel-peach",
};

/**
 * Shared server-rendered profile panel with an interactive child island.
 */
export function ProfileFeaturePanel({
  tone,
  eyebrow,
  title,
  description,
  illustration,
  children,
}: ProfileFeaturePanelProps) {
  return (
    <section
      className={cn("rounded-fc-36 p-fc-24 md:p-fc-36", tone_classes[tone])}
    >
      <div className="grid gap-fc-24 lg:grid-cols-2">
        <div>
          <p className="text-fc-12 font-medium uppercase tracking-widest">
            {eyebrow}
          </p>
          <h2 className="mt-fc-12 font-display text-fc-36 leading-none font-bold">
            {title}
          </h2>
          <p className="mt-fc-18 text-fc-18 leading-relaxed">{description}</p>
          <IllustrationSlot {...illustration} className="mt-fc-24" />
        </div>
        {children}
      </div>
    </section>
  );
}
