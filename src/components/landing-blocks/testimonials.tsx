import * as React from "react";
import { Star } from "lucide-react";
import type { TestimonialsProps } from "@/lib/landing-blocks/types";

export function TestimonialsBlock({ props }: { props: TestimonialsProps }) {
  return (
    <section className="bg-muted/30 py-20">
      <div className="mx-auto max-w-6xl px-6">
        {props.heading || props.subheading ? (
          <div className="mx-auto mb-12 max-w-2xl text-center">
            {props.heading && <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{props.heading}</h2>}
            {props.subheading && <p className="mt-3 text-muted-foreground">{props.subheading}</p>}
          </div>
        ) : null}
        <div className="grid gap-5 md:grid-cols-3">
          {props.items.map((item, i) => (
            <div key={i} className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-6">
              {item.rating ? (
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star
                      key={s}
                      className="size-4"
                      style={{ color: s < item.rating! ? "var(--lp-primary, var(--primary))" : undefined }}
                      fill={s < item.rating! ? "var(--lp-primary, var(--primary))" : "none"}
                    />
                  ))}
                </div>
              ) : null}
              <blockquote className="flex-1 text-sm leading-relaxed text-foreground/80">
                &ldquo;{item.quote}&rdquo;
              </blockquote>
              <footer>
                <p className="text-sm font-semibold">{item.name}</p>
                {item.role && <p className="text-xs text-muted-foreground">{item.role}</p>}
              </footer>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
