"use client";
import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CurriculumProps } from "@/lib/landing-blocks/types";

export function CurriculumBlock({ props }: { props: CurriculumProps }) {
  const [open, setOpen] = React.useState<number | null>(0);
  return (
    <section className="bg-background py-20">
      <div className="mx-auto max-w-3xl px-6">
        {props.heading || props.subheading ? (
          <div className="mb-10 text-center">
            {props.heading && <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{props.heading}</h2>}
            {props.subheading && <p className="mt-3 text-muted-foreground">{props.subheading}</p>}
          </div>
        ) : null}
        <ol className="space-y-3">
          {props.modules.map((mod, i) => (
            <li key={i} className="overflow-hidden rounded-xl border border-border/70">
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center gap-4 px-5 py-4 text-start hover:bg-muted/30 transition-colors"
              >
                <span
                  className="grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold text-primary-foreground"
                  style={{ backgroundColor: "var(--lp-primary, var(--primary))" }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{mod.title}</p>
                  {mod.duration && <p className="text-xs text-muted-foreground">{mod.duration} · {mod.lessons.length} lessons</p>}
                </div>
                <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open === i && "rotate-180")} />
              </button>
              {open === i && (
                <ul className="border-t border-border/50 bg-muted/20 px-5 py-3 space-y-1">
                  {mod.lessons.map((lesson, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                      <span className="size-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                      {lesson}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
