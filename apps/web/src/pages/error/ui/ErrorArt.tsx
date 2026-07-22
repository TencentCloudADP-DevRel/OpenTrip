import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib";
import type { ErrorPhoto } from "../model/variants";

/** Builds a responsive Unsplash CDN url. `auto=format` lets the CDN negotiate
 *  AVIF/WebP; the width is baked into the query so each srcSet entry is a
 *  distinct crop request. */
function unsplashSrc(id: string, width: number): string {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&q=80&w=${width}`;
}

/** Travel photo for an error surface. Alt text comes from i18n; nothing is
 *  overlaid on the image. Fades in on load so it never pops from nothing. */
export function ErrorArt({ photo }: { photo: ErrorPhoto }) {
  const { t } = useTranslation("error");
  const [loaded, setLoaded] = useState(false);

  return (
    <figure className="overflow-hidden rounded-2xl bg-muted shadow-[var(--shadow-md)] ring-1 ring-border">
      {/* Fixed aspect box reserves space before the photo decodes (no CLS). */}
      <div className="aspect-[4/3] w-full">
        <img
          src={unsplashSrc(photo.id, 1200)}
          srcSet={`${unsplashSrc(photo.id, 800)} 800w, ${unsplashSrc(photo.id, 1200)} 1200w, ${unsplashSrc(photo.id, 1600)} 1600w`}
          sizes="(min-width: 1024px) 40rem, 100vw"
          alt={t(`photos.${photo.descriptionKey}`)}
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={cn(
            "size-full object-cover transition-[opacity,scale] duration-slow ease-out",
            loaded ? "scale-100 opacity-100" : "scale-[1.02] opacity-0",
          )}
        />
      </div>
    </figure>
  );
}
