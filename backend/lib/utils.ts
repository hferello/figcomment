import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * Custom `text-fc-*` sizes share the `text-` prefix with color utilities.
 * Without this, twMerge treats them as conflicts and drops button colors
 * like `text-primary-foreground` when a size class is also present.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "fc-12",
            "fc-14",
            "fc-18",
            "fc-21",
            "fc-24",
            "fc-36",
            "fc-48",
            "fc-56",
            "fc-63",
            "fc-72",
            "fc-96",
          ],
        },
      ],
      "text-color": [
        {
          text: [
            "fc-ink",
            "fc-bg",
            "fc-panel-blue",
            "fc-panel-yellow",
            "fc-panel-pink",
            "fc-panel-peach",
          ],
        },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
