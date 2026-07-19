import { cn } from "@/lib/utils";

type YoutubeEmbedProps = {
  /** YouTube video ID (e.g. "QON1ogGs5eY") */
  videoId: string;
  /** Accessible label for the iframe */
  title: string;
  className?: string;
};

/**
 * Responsive 16:9 YouTube embed using the privacy-enhanced host.
 * Keeps layout stable with an aspect-ratio wrapper so the hero does not jump.
 */
export function YoutubeEmbed({ videoId, title, className }: YoutubeEmbedProps) {
  return (
    <div className={cn("overflow-hidden rounded-fc-24 bg-fc-ink/6", className)}>
      <div className="relative aspect-video w-full">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}`}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    </div>
  );
}
