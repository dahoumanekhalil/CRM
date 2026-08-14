import * as React from "react";
import Image from "next/image";
import type { InstructorProps } from "@/lib/landing-blocks/types";

export function InstructorBlock({ props }: { props: InstructorProps }) {
  return (
    <section className="bg-muted/30 py-20">
      <div className="mx-auto max-w-4xl px-6">
        {props.heading ? (
          <h2 className="mb-10 text-center text-3xl font-bold tracking-tight md:text-4xl">
            {props.heading}
          </h2>
        ) : null}
        <div className="flex flex-col items-center gap-8 rounded-2xl border border-border/70 bg-card p-8 md:flex-row md:items-start md:p-10">
          {props.avatarUrl ? (
            <div className="relative size-32 shrink-0 overflow-hidden rounded-full border border-border/70 shadow-inner md:size-40">
              <Image
                src={props.avatarUrl}
                alt={props.name}
                fill
                sizes="160px"
                className="object-cover"
              />
            </div>
          ) : (
            <div
              className="grid size-32 shrink-0 place-items-center rounded-full text-4xl font-bold text-primary-foreground md:size-40 md:text-5xl"
              style={{ backgroundColor: "var(--lp-primary, var(--primary))" }}
            >
              {props.name
                .split(/\s+/)
                .slice(0, 2)
                .map((w) => w[0])
                .join("")}
            </div>
          )}
          <div className="min-w-0 space-y-3 text-center md:text-start">
            <div>
              <h3 className="text-xl font-bold">{props.name}</h3>
              {props.title ? (
                <p className="text-sm text-muted-foreground">{props.title}</p>
              ) : null}
            </div>
            {props.bio ? (
              <p className="leading-relaxed text-muted-foreground">{props.bio}</p>
            ) : null}
            {props.expertise && props.expertise.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-1.5 md:justify-start">
                {props.expertise.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-md border border-border/70 bg-background px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
