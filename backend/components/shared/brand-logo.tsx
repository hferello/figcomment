"use client";

/**
 * Inline Figcomment mark with eyes that follow the pointer.
 * Pupils stay capped near their home positions so they never leave the face.
 */

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
};

type EyeOffset = {
  x: number;
  y: number;
};

const LEFT_EYE = { cx: 273.87, cy: 281.032, r: 45.9348 };
const RIGHT_EYE = { cx: 441.532, cy: 281.032, r: 45.9348 };
/** Max pupil travel in SVG viewBox units (~700×700). */
const MAX_PUPIL_OFFSET = 36;

function clampPupilOffset(
  mouse_x: number,
  mouse_y: number,
  logo_center_x: number,
  logo_center_y: number,
): EyeOffset {
  const dx = mouse_x - logo_center_x;
  const dy = mouse_y - logo_center_y;
  const distance = Math.hypot(dx, dy);

  if (distance === 0) {
    return { x: 0, y: 0 };
  }

  const scale = Math.min(MAX_PUPIL_OFFSET, distance * 0.14) / distance;
  return { x: dx * scale, y: dy * scale };
}

export function BrandLogo({ className }: BrandLogoProps) {
  const react_id = useId();
  const mask_id = `brand-logo-mask-${react_id}`;
  const gradient_id = `brand-logo-gradient-${react_id}`;
  const svg_ref = useRef<SVGSVGElement>(null);
  const [offset, setOffset] = useState<EyeOffset>({ x: 0, y: 0 });
  const [reduce_motion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncReduceMotion = () => {
      setReduceMotion(media.matches);
      if (media.matches) {
        setOffset({ x: 0, y: 0 });
      }
    };

    syncReduceMotion();
    media.addEventListener("change", syncReduceMotion);
    return () => media.removeEventListener("change", syncReduceMotion);
  }, []);

  useEffect(() => {
    if (reduce_motion) {
      return;
    }

    const onPointerMove = (event: PointerEvent) => {
      const svg = svg_ref.current;
      if (!svg) {
        return;
      }

      const rect = svg.getBoundingClientRect();
      const next = clampPupilOffset(
        event.clientX,
        event.clientY,
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      );
      setOffset(next);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, [reduce_motion]);

  return (
    <svg
      ref={svg_ref}
      viewBox="0 0 700 700"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("h-fc-72 w-auto", className)}
    >
      <mask
        id={mask_id}
        maskUnits="userSpaceOnUse"
        x="44.6094"
        y="54.2197"
        width="611"
        height="592"
        fill="black"
      >
        <rect fill="white" x="44.6094" y="54.2197" width="611" height="592" />
        <path d="M440.447 104.22C531.543 104.22 605.391 178.068 605.392 269.164V315.054C605.392 406.15 531.544 479.998 440.447 479.998H359.957L229.786 592.729C221.754 599.685 209.266 593.98 209.266 583.354V472.188C142.762 450.923 94.6094 388.613 94.6094 315.054V269.164C94.6095 178.068 168.457 104.22 259.554 104.22H440.447Z" />
      </mask>
      <path
        d="M440.447 104.22C531.543 104.22 605.391 178.068 605.392 269.164V315.054C605.392 406.15 531.544 479.998 440.447 479.998H359.957L229.786 592.729C221.754 599.685 209.266 593.98 209.266 583.354V472.188C142.762 450.923 94.6094 388.613 94.6094 315.054V269.164C94.6095 178.068 168.457 104.22 259.554 104.22H440.447Z"
        fill="white"
      />
      <path
        d="M440.447 104.22L440.447 54.2197H440.447V104.22ZM605.392 269.164H655.392V269.164L605.392 269.164ZM605.392 315.054L655.392 315.054V315.054H605.392ZM440.447 479.998V529.998H440.447L440.447 479.998ZM359.957 479.998V429.998C347.934 429.998 336.313 434.331 327.224 442.202L359.957 479.998ZM229.786 592.729L262.518 630.527L262.519 630.526L229.786 592.729ZM209.266 583.354H159.266V583.355L209.266 583.354ZM209.266 472.188H259.266C259.266 450.441 245.208 431.188 224.494 424.564L209.266 472.188ZM94.6094 315.054H44.6094V315.054L94.6094 315.054ZM94.6094 269.164L44.6094 269.164V269.164H94.6094ZM259.554 104.22V54.2197V54.2197V104.22ZM440.447 104.22L440.447 154.22C503.929 154.22 555.391 205.682 555.392 269.164L605.392 269.164L655.392 269.164C655.391 150.454 559.158 54.2201 440.447 54.2197L440.447 104.22ZM605.392 269.164H555.392V315.054H605.392H655.392V269.164H605.392ZM605.392 315.054L555.392 315.054C555.392 378.536 503.929 429.998 440.447 429.998L440.447 479.998L440.447 529.998C559.158 529.998 655.392 433.764 655.392 315.054L605.392 315.054ZM440.447 479.998V429.998H359.957V479.998V529.998H440.447V479.998ZM359.957 479.998L327.224 442.202L197.053 554.933L229.786 592.729L262.519 630.526L392.69 517.794L359.957 479.998ZM229.786 592.729L197.054 554.932C221.404 533.846 259.265 551.142 259.266 583.354L209.266 583.354L159.266 583.355C159.266 636.817 222.104 665.524 262.518 630.527L229.786 592.729ZM209.266 583.354H259.266V472.188H209.266H159.266V583.354H209.266ZM209.266 472.188L224.494 424.564C178.1 409.729 144.609 366.237 144.609 315.054L94.6094 315.054L44.6094 315.054C44.6094 410.989 107.424 492.117 194.037 519.813L209.266 472.188ZM94.6094 315.054H144.609V269.164H94.6094H44.6094V315.054H94.6094ZM94.6094 269.164L144.609 269.164C144.609 205.682 196.072 154.22 259.554 154.22V104.22V54.2197C140.843 54.2197 44.6096 150.454 44.6094 269.164L94.6094 269.164ZM259.554 104.22V154.22H440.447V104.22V54.2197H259.554V104.22Z"
        fill={`url(#${gradient_id})`}
        mask={`url(#${mask_id})`}
      />
      <circle
        className={reduce_motion ? undefined : "brand-logo-eye"}
        cx={LEFT_EYE.cx + offset.x}
        cy={LEFT_EYE.cy + offset.y}
        r={LEFT_EYE.r}
        fill="black"
      />
      <circle
        className={reduce_motion ? undefined : "brand-logo-eye"}
        cx={RIGHT_EYE.cx + offset.x}
        cy={RIGHT_EYE.cy + offset.y}
        r={RIGHT_EYE.r}
        fill="black"
      />
      <defs>
        <radialGradient
          id={gradient_id}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(605.392 595.78) rotate(-180) scale(510.782 3404.16)"
        >
          <stop stopColor="#FFAA00" />
          <stop offset="0.5" stopColor="#FF00FB" />
          <stop offset="1" stopColor="#0033FF" />
        </radialGradient>
      </defs>
    </svg>
  );
}
