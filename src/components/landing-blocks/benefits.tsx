import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import type { BenefitsProps } from "@/lib/landing-blocks/types";

export function BenefitsBlock({ props }: { props: BenefitsProps }) {
  const cols = props.columns ?? 2;
  return (
    <section className="bg-background py-20">
      <div className="mx-auto max-w-4xl px-6">
        {props.heading || props.subheading ? (
          <div className="mb-10 text-center">
            {props.heading && <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{props.heading}</h2>}
            {props.subheading && <p className="mt-3 text-muted-foreground">{props.subheading}</p>}
          </div>
        ) : null}
        <ul className={`grid gap-3 ${cols === 2 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
          {props.items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
              <CheckCircle2
                className="mt-0.5 size-5 shrink-0"
                style={{ color: "var(--lp-primary, var(--primary))" }}
              />
              <span className="text-sm leading-snug">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
