import * as React from "react";
import type { CTAProps } from "@/lib/landing-blocks/types";

export function CTABlock({ props }: { props: CTAProps }) {
  return (
    <section id="register" className="bg-background py-20">
      <div className="mx-auto max-w-4xl px-6">
        <div
          className="relative overflow-hidden rounded-3xl p-10 text-center md:p-16"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in oklch, var(--lp-primary, var(--primary)) 92%, black) 0%, var(--lp-primary, var(--primary)) 100%)",
          }}
        >
          <h2 className="text-3xl font-bold tracking-tight text-primary-foreground md:text-4xl">
            {props.headline}
          </h2>
          {props.subheadline ? (
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">
              {props.subheadline}
            </p>
          ) : null}
          <div className="mt-8">
            <a
              href={props.ctaHref || "#"}
              className="inline-flex h-12 items-center justify-center rounded-lg bg-white px-8 text-sm font-semibold text-neutral-950 shadow-lg transition-transform hover:scale-[1.02]"
            >
              {props.ctaLabel}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
