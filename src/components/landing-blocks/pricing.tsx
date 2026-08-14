import * as React from "react";
import { Check } from "lucide-react";
import type { PricingProps } from "@/lib/landing-blocks/types";

export function PricingBlock({ props }: { props: PricingProps }) {
  return (
    <section id="pricing" className="bg-background py-20">
      <div className="mx-auto max-w-3xl px-6">
        {props.heading ? (
          <h2 className="mb-10 text-center text-3xl font-bold tracking-tight md:text-4xl">
            {props.heading}
          </h2>
        ) : null}
        <div
          className="rounded-2xl border-2 bg-card p-8 md:p-10"
          style={{
            borderColor: "color-mix(in oklch, var(--lp-primary, var(--primary)) 40%, transparent)",
          }}
        >
          <div className="mb-6 flex items-baseline justify-center gap-2">
            {props.currency ? (
              <span className="text-2xl font-semibold text-muted-foreground">
                {props.currency}
              </span>
            ) : null}
            <span className="text-6xl font-bold tabular-nums">
              {props.price ?? "—"}
            </span>
            {props.period ? (
              <span className="text-sm text-muted-foreground">
                {props.period}
              </span>
            ) : null}
          </div>
          <ul className="mx-auto max-w-md space-y-3">
            {props.features.map((f, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <Check
                  className="mt-0.5 size-4 shrink-0"
                  style={{ color: "var(--lp-primary, var(--primary))" }}
                />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          {props.ctaLabel ? (
            <div className="mt-8 text-center">
              <a
                href={props.ctaHref || "#"}
                className="inline-flex h-11 items-center justify-center rounded-lg px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.01]"
                style={{ backgroundColor: "var(--lp-primary, var(--primary))" }}
              >
                {props.ctaLabel}
              </a>
              {props.note ? (
                <p className="mt-3 text-xs text-muted-foreground">{props.note}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
