import * as React from "react";
import { cn } from "@/lib/utils";
import type { TwoColumnProps } from "@/lib/landing-blocks/types";

export function TwoColumnBlock({ props }: { props: TwoColumnProps }) {
  const imageLeft = props.layout === "image-left";

  return (
    <section className="py-20 bg-background">
      <div className="mx-auto max-w-6xl px-6">
        <div
          className={cn(
            "flex flex-col gap-12 md:flex-row md:items-center",
            imageLeft && "md:flex-row-reverse"
          )}
        >
          {/* Text side */}
          <div className="flex-1 space-y-5">
            {props.eyebrow && (
              <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {props.eyebrow}
              </span>
            )}
            {props.heading && (
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                {props.heading}
              </h2>
            )}
            {props.body && (
              <p className="text-lg leading-relaxed text-muted-foreground">
                {props.body}
              </p>
            )}
            {props.ctaLabel && (
              <div className="pt-1">
                <a
                  href={props.ctaHref || "#"}
                  className="inline-flex h-11 items-center justify-center rounded-lg px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.01]"
                  style={{ backgroundColor: "var(--lp-primary, var(--primary))" }}
                >
                  {props.ctaLabel}
                </a>
              </div>
            )}
          </div>

          {/* Image side */}
          <div className="flex-1">
            {props.imageUrl ? (
              <div className="relative overflow-hidden rounded-2xl border border-border/70 shadow-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={props.imageUrl}
                  alt={props.imageAlt ?? ""}
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border-2 border-dashed border-border/50 bg-muted/20 text-sm text-muted-foreground/50">
                Add image URL in the inspector
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
