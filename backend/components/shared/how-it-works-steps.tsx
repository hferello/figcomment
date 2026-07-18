import Image from "next/image";
import { cn } from "@/lib/utils";

type PanelTone = "cyan" | "lavender" | "peach" | "mint";

export type HowItWorksStep = {
  step: string;
  title: string;
  description: string;
  tone: PanelTone;
  illustration: {
    src: string;
    alt: string;
  };
};

type HowItWorksStepsProps = {
  steps: HowItWorksStep[];
  className?: string;
};

const tone_classes: Record<PanelTone, string> = {
  cyan: "bg-fc-panel-cyan",
  lavender: "bg-fc-panel-lavender",
  peach: "bg-fc-panel-peach",
  mint: "bg-fc-panel-mint",
};

/**
 * Reusable numbered step cards. Caller owns the content.
 */
export function HowItWorksSteps({ steps, className }: HowItWorksStepsProps) {
  return (
    <ol className={cn("grid gap-fc-24 lg:grid-cols-3", className)}>
      {steps.map((item) => (
        <li
          key={item.step}
          className={cn(
            "relative gap-fc-18 rounded-fc-36 p-fc-24 md:gap-fc-24 md:p-fc-36",
            tone_classes[item.tone],
          )}
        >
          <span className="text-fc-72">{item.step}</span>
          <h3 className="mt-fc-18 font-display text-fc-36 leading-none font-bold">
            {item.title}
          </h3>
          <p className="mt-fc-18 text-fc-18 leading-relaxed">
            {item.description}
          </p>
          <Image
            src={item.illustration.src}
            alt={item.illustration.alt}
            width={128}
            height={128}
            aria-hidden
            className="absolute top-4 right-4 shrink-0"
          />
        </li>
      ))}
    </ol>
  );
}
