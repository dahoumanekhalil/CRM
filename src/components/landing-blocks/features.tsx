import * as React from "react";
import * as Lucide from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2 } from "lucide-react";
import type { FeaturesProps } from "@/lib/landing-blocks/types";

function resolveIcon(name?: string): LucideIcon {
  if (!name) return CheckCircle2;
  const registry = Lucide as unknown as Record<string, LucideIcon>;
  return registry[name] ?? CheckCircle2;
}

export function FeaturesBlock({ props }: { props: FeaturesProps }) {
  return (
    <section className="bg-background py-20">
      <div className="mx-auto max-w-6xl px-6">
        {props.heading || props.subheading ? (
          <div className="mx-auto mb-12 max-w-2xl text-center">
            {props.heading ? (
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                {props.heading}
              </h2>
            ) : null}
            {props.subheading ? (
              <p className="mt-3 text-muted-foreground">{props.subheading}</p>
            ) : null}
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {props.items.map((item, i) => {
            const Icon = resolveIcon(item.icon);
            return (
              <div
                key={i}
                className="rounded-xl border border-border/70 bg-card p-6 transition-colors hover:border-border"
              >
                <div
                  className="mb-4 grid size-10 place-items-center rounded-md text-primary-foreground"
                  style={{ backgroundColor: "var(--lp-primary, var(--primary))" }}
                >
                  <Icon className="size-5" />
                </div>
                <h3 className="text-base font-semibold">{item.title}</h3>
                {item.description ? (
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
