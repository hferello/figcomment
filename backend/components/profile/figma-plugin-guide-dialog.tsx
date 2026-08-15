"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { app_constants } from "@/data/constants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type GuideStep = {
  step: string;
  title: string;
  description: ReactNode;
  illustration: {
    src: string;
    alt: string;
  };
};

const FIGMA_PLUGIN_GUIDE_STEPS: GuideStep[] = [
  {
    step: "01",
    title: "Import from manifest",
    description:
      "In Figma, open Plugins → Development, then choose Import plugin from manifest…",
    illustration: {
      src: "/figma-plugin-1.jpg",
      alt: "Figma Plugins menu with Development and Import plugin from manifest highlighted",
    },
  },
  {
    step: "02",
    title: "Select manifest.json",
    description:
      "Unzip the download, open the plugin folder, and select its manifest.json file.",
    illustration: {
      src: "/figma-plugin-2.jpg",
      alt: `macOS file picker with manifest.json selected in the ${app_constants.backend.safe_title} plugin folder`,
    },
  },
  {
    step: "03",
    title: "Confirm it loaded",
    description:
      `${app_constants.backend.title} should appear under Plugins & widgets with a Development badge.`,
    illustration: {
      src: "/figma-plugin-3.jpg",
      alt: `Figma Resources panel showing ${app_constants.backend.title} listed as a development plugin`,
    },
  },
  {
    step: "04",
    title: "Paste your plugin token",
    description: (
      <>
        Run {app_constants.backend.title}, paste the{" "}
        <code className="font-mono text-fc-14">fc_…</code> token from your
        account, then click Continue.
      </>
    ),
    illustration: {
      src: "/figma-plugin-4.jpg",
      alt: `${app_constants.backend.title} plugin setup screen with a plugin token input field`,
    },
  },
  {
    step: "05",
    title: "Start sorting feedback",
    description:
      "Once connected, pick Table, Sticky notes, or CSV to analyse and sort comments.",
    illustration: {
      src: "/figma-plugin-5.jpg",
      alt: `${app_constants.backend.title} plugin main screen with output format options`,
    },
  },
];

type FigmaPluginGuideDialogProps = {
  children?: ReactNode;
  triggerClassName?: string;
};

/**
 * Step-by-step guide for importing the development plugin in Figma.
 */
export function FigmaPluginGuideDialog({
  children = "How to import it",
  triggerClassName,
}: FigmaPluginGuideDialogProps) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className={
              triggerClassName ??
              "inline align-baseline text-fc-14 leading-[1.2] font-medium text-muted-foreground underline underline-offset-4 hover:text-fc-ink"
            }
          />
        }
      >
        {children}
      </DialogTrigger>

      <DialogContent className="max-h-[min(90vh,56rem)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Import the {app_constants.backend.title} plugin</DialogTitle>
          <DialogDescription>
            Five steps in Figma. Download and unzip the plugin first, then
            import it as a development plugin.
          </DialogDescription>
        </DialogHeader>

        <ol className="mt-fc-12 grid gap-fc-18 md:grid-cols-2">
          {FIGMA_PLUGIN_GUIDE_STEPS.map((item) => (
            <li
              key={item.step}
              className="flex flex-col gap-fc-18 rounded-fc-36 bg-muted p-fc-18 md:p-fc-24"
            >
              <Image
                src={item.illustration.src}
                alt={item.illustration.alt}
                width={640}
                height={400}
                className="h-auto w-full rounded-fc-18 border border-fc-ink/12 bg-fc-bg object-cover"
              />
              <div>
                <span className="text-fc-14 font-medium text-muted-foreground">
                  {item.step}
                </span>
                <h3 className="mt-fc-12 font-display text-fc-24 leading-none font-bold">
                  {item.title}
                </h3>
                <p className="mt-fc-12 text-fc-14 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
