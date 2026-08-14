import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { HeroProps } from "@/lib/landing-blocks/types";

export function HeroBlock({ props }: { props: HeroProps }) {
  const align = props.align ?? "start";
  return (
    <section className="relative overflow-hidden bg-background py-20 md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_top,black_35%,transparent_75%)]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 0%, color-mix(in oklch, var(--lp-primary,var(--primary)) 18%, transparent), transparent 60%)",
        }}
      />
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 md:flex-row md:items-center">
        <div
          className={cn(
            "flex-1 space-y-5",
            align === "center" && "text-center md:text-start"
          )}
        >
          {props.eyebrow ? (
            <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {props.eyebrow}
            </span>
          ) : null}
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            {props.headline}
          </h1>
          {props.subheadline ? (
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              {props.subheadline}
            </p>
          ) : null}
          {props.ctaLabel ? (
            <div className="pt-2">
              <a
                href={props.ctaHref || "#"}
                className="inline-flex h-11 items-center justify-center rounded-lg px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.01]"
                style={{ backgroundColor: "var(--lp-primary, var(--primary))" }}
              >
                {props.ctaLabel}
              </a>
            </div>
          ) : null}
        </div>
        {props.imageUrl ? (
          <div className="relative aspect-[4/3] w-full flex-1 overflow-hidden rounded-2xl border border-border/70 shadow-2xl md:aspect-[5/4]">
            <Image
              src={props.imageUrl}
              alt=""
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
