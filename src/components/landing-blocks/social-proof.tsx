import * as React from "react";
import type { SocialProofProps } from "@/lib/landing-blocks/types";

export function SocialProofBlock({ props }: { props: SocialProofProps }) {
  return (
    <section className="py-16" style={{ backgroundColor: "color-mix(in oklch, var(--lp-primary, var(--primary)) 8%, var(--background))" }}>
      <div className="mx-auto max-w-5xl px-6 text-center">
        {props.heading && (
          <h2 className="mb-10 text-2xl font-bold tracking-tight md:text-3xl">{props.heading}</h2>
        )}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {props.stats.map((stat, i) => (
            <div key={i}>
              <p
                className="text-4xl font-extrabold tracking-tight md:text-5xl"
                style={{ color: "var(--lp-primary, var(--primary))" }}
              >
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
        {props.note && (
          <p className="mt-8 text-xs text-muted-foreground">{props.note}</p>
        )}
      </div>
    </section>
  );
}
