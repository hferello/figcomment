import Image from "next/image";
import { cn } from "@/lib/utils";

type IllustrationSlotProps = {
  src: string;
  alt: string;
  caption: string;
  className?: string;
};

/**
 * Stable placeholder frame for owner-supplied artwork.
 * Keeping the slot dimensions fixed prevents layout shifts when final assets arrive.
 */
export function IllustrationSlot({
  src,
  alt,
  caption,
  className,
}: IllustrationSlotProps) {
  return (
    <figure className={cn("m-0", className)}>
      <Image
        src={src}
        alt={alt}
        width={640}
        height={420}
        className="h-auto w-full"
      />
      <figcaption className="mt-fc-12 text-center text-fc-24 text-fc-ink/48">
        {caption}
      </figcaption>
    </figure>
  );
}
