"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GalleryProps } from "@/lib/landing-blocks/types";

const COLS: Record<number, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
};

export function GalleryBlock({ props }: { props: GalleryProps }) {
  const [lightbox, setLightbox] = React.useState<number | null>(null);
  const cols = COLS[props.columns ?? 3];

  function prev(e: React.MouseEvent) {
    e.stopPropagation();
    setLightbox((i) => (i === null ? null : i === 0 ? props.images.length - 1 : i - 1));
  }

  function next(e: React.MouseEvent) {
    e.stopPropagation();
    setLightbox((i) => (i === null ? null : (i + 1) % props.images.length));
  }

  React.useEffect(() => {
    if (lightbox === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowLeft") setLightbox((i) => (i === null ? null : i === 0 ? props.images.length - 1 : i - 1));
      if (e.key === "ArrowRight") setLightbox((i) => (i === null ? null : (i + 1) % props.images.length));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, props.images.length]);

  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        {(props.heading || props.subheading) && (
          <div className="mb-10 text-center">
            {props.heading && (
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{props.heading}</h2>
            )}
            {props.subheading && (
              <p className="mt-3 text-muted-foreground">{props.subheading}</p>
            )}
          </div>
        )}

        <div className={cn("grid gap-3", cols)}>
          {props.images.map((img, i) => (
            <button
              key={i}
              onClick={() => setLightbox(i)}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border/60 bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {img.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={img.url}
                  alt={img.caption ?? `Gallery image ${i + 1}`}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground/40 text-sm">
                  No image
                </div>
              )}
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                {img.caption && (
                  <p className="px-4 pb-4 text-sm font-medium text-white">{img.caption}</p>
                )}
                <div className="absolute right-3 top-3 rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm">
                  <ZoomIn className="size-3.5" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          {/* Close */}
          <button
            aria-label="Close"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20 transition-colors"
          >
            <X className="size-5" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white/70">
            {lightbox + 1} / {props.images.length}
          </div>

          {/* Prev */}
          <button
            aria-label="Previous"
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="size-5" />
          </button>

          {/* Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={props.images[lightbox]?.url ?? ""}
            alt={props.images[lightbox]?.caption ?? ""}
            className="max-h-[85vh] max-w-[80vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next */}
          <button
            aria-label="Next"
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors"
          >
            <ChevronRight className="size-5" />
          </button>

          {/* Caption */}
          {props.images[lightbox]?.caption && (
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center text-sm text-white/70">
              {props.images[lightbox].caption}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
