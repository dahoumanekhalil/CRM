"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FAQProps } from "@/lib/landing-blocks/types";

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="rounded-lg border border-border/70 bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start text-sm font-medium hover:bg-muted/40"
      >
        <span>{q}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open ? (
        <div className="border-t border-border/70 px-5 py-4 text-sm leading-relaxed text-muted-foreground">
          {a}
        </div>
      ) : null}
    </div>
  );
}

export function FAQBlock({ props }: { props: FAQProps }) {
  return (
    <section className="bg-muted/30 py-20">
      <div className="mx-auto max-w-3xl px-6">
        {props.heading ? (
          <h2 className="mb-10 text-center text-3xl font-bold tracking-tight md:text-4xl">
            {props.heading}
          </h2>
        ) : null}
        <div className="space-y-3">
          {props.items.map((item, i) => (
            <FAQItem key={i} q={item.question} a={item.answer} />
          ))}
        </div>
      </div>
    </section>
  );
}
