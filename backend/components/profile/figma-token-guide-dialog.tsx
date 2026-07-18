"use client";

import Image from "next/image";
import type { ReactNode } from "react";
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

const FIGMA_PAT_GUIDE_STEPS: GuideStep[] = [
  {
    step: "01",
    title: "Open Account settings",
    description:
      "In Figma, open Help and account, then choose Account settings.",
    illustration: {
      src: "/figma-pat-1.png",
      alt: "Figma Help and account menu with Account settings highlighted",
    },
  },
  {
    step: "02",
    title: "Open the Security tab",
    description:
      "In Settings, select Security. Personal access tokens live further down this page.",
    illustration: {
      src: "/figma-pat-2.png",
      alt: "Figma Settings dialog with the Security tab selected",
    },
  },
  {
    step: "03",
    title: "Configure your token",
    description: (
      <>
        Name it Figcomment, pick an expiry, and enable{" "}
        <code className="font-mono text-fc-14">file_comments:read</code> so
        Figcomment can read comments.
      </>
    ),
    illustration: {
      src: "/figma-pat-3.png",
      alt: "Figma token form with Figcomment name and file_comments:read checked",
    },
  },
  {
    step: "04",
    title: "Copy it once",
    description:
      "Generate the token, copy the figd_… value immediately, then paste it here. Figma will not show it again.",
    illustration: {
      src: "/figma-pat-4.png",
      alt: "Figma yellow banner showing a newly generated personal access token",
    },
  },
];

/**
 * Label-adjacent help: step-by-step Figma PAT guide in an expanding dialog.
 */
export function FigmaTokenGuideDialog() {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className="inline align-baseline text-fc-14 leading-[1.2] font-medium text-muted-foreground underline underline-offset-4 hover:text-fc-ink"
          />
        }
      >
        How to get one
      </DialogTrigger>


      <DialogContent className="max-h-[min(90vh,56rem)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Get a Figma personal access token</DialogTitle>
          <DialogDescription>
            Four steps in Figma. Copy the token once, then paste it into
            Figcomment.
          </DialogDescription>
        </DialogHeader>

        <ol className="mt-fc-12 grid gap-fc-18 md:grid-cols-2">
          {FIGMA_PAT_GUIDE_STEPS.map((item) => (
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
