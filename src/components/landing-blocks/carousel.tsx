"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CarouselProps } from "@/lib/landing-blocks/types";

export function CarouselBlock({ props }: { props: CarouselProps }) {
  const [current, setCurrent] = React.useState(0);
  const count = props.slides.length;

  const prev = React.useCallback(
    () => setCurrent((c) => (c === 0 ? count - 1 : c - 1)),
    [count]
  );
  const next = React.useCallback(
    () => setCurrent((c) => (c + 1) % count),
    [count]
  );

  // Auto-play
  React.useEffect(() => {
    if (!props.autoPlay || count <= 1) return;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [props.autoPlay, count, next]);

  if (!count) return null;

  return (
    <section className="py-20 bg-muted/20">
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

        {/* Carousel track */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-lg">
          <div className="relative aspect-[16/7]">
            {props.slides.map((slide, i) => (
              <div
                key={i}
                aria-hidden={i !== current}
                className={cn(
                  "absolute inset-0 transition-all duration-500 ease-in-out",
                  i === current
                    ? "opacity-100 z-10"
                    : "opacity-0 z-0 pointer-events-none"
                )}
              >
                {slide.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={slide.imageUrl}
                    alt={slide.title ?? `Slide ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-muted text-muted-foreground/40 text-sm">
                    No image — add a URL in the inspector
                  </div>
                )}

                {/* Text overlay */}
                {(slide.title || slide.description || slide.badge) && (
                  <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/75 via-black/20 to-transparent px-8 pb-8 pt-20">
                    {slide.badge && (
                      <span
                        className="mb-3 inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold text-white/90"
                        style={{ backgroundColor: "color-mix(in oklch, var(--lp-primary,var(--primary)) 80%, black)" }}
                      >
                        {slide.badge}
                      </span>
                    )}
                    {slide.title && (
                      <h3 className="text-2xl font-bold text-white md:text-3xl">{slide.title}</h3>
                    )}
                    {slide.description && (
                      <p className="mt-1.5 max-w-lg text-white/80">{slide.description}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Arrows */}
          {count > 1 && (
            <>
              <button
                aria-label="Previous slide"
                onClick={prev}
                className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/40 p-2.5 text-white hover:bg-black/60 transition-colors backdrop-blur-sm"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                aria-label="Next slide"
                onClick={next}
                className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/40 p-2.5 text-white hover:bg-black/60 transition-colors backdrop-blur-sm"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}
        </div>

        {/* Dots */}
        {count > 1 && (
          <div className="mt-5 flex items-center justify-center gap-2">
            {props.slides.map((_, i) => (
              <button
                key={i}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setCurrent(i)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i === current
                    ? "w-6 bg-foreground"
                    : "w-2 bg-foreground/25 hover:bg-foreground/50"
                )}
                style={i === current ? { backgroundColor: "var(--lp-primary, var(--primary))" } : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
