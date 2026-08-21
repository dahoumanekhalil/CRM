"use client";

import * as React from "react";
import type { CountdownProps } from "@/lib/landing-blocks/types";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function computeTimeLeft(target: Date): TimeLeft | null {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function Digit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative flex min-w-[80px] flex-col items-center justify-center rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-sm md:min-w-[100px] md:px-7 md:py-5"
      >
        <span
          className="text-4xl font-bold tabular-nums md:text-5xl"
          style={{ color: "var(--lp-primary, var(--primary))" }}
        >
          {pad(value)}
        </span>
      </div>
      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export function CountdownBlock({ props }: { props: CountdownProps }) {
  const [timeLeft, setTimeLeft] = React.useState<TimeLeft | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    if (!props.targetDate) return;
    const target = new Date(props.targetDate);
    setTimeLeft(computeTimeLeft(target));
    const id = setInterval(() => setTimeLeft(computeTimeLeft(target)), 1000);
    return () => clearInterval(id);
  }, [props.targetDate]);

  return (
    <section className="py-20">
      <div className="mx-auto max-w-4xl px-6 text-center">
        {props.heading && (
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{props.heading}</h2>
        )}
        {props.subheading && (
          <p className="mt-3 text-muted-foreground">{props.subheading}</p>
        )}

        <div className="mt-10">
          {!mounted ? (
            // SSR / hydration placeholder — no flash
            <div className="flex justify-center gap-4">
              {["Days", "Hours", "Minutes", "Seconds"].map((label) => (
                <Digit key={label} value={0} label={label} />
              ))}
            </div>
          ) : timeLeft === null ? (
            <div className="rounded-2xl border border-border/70 bg-muted/30 px-8 py-6">
              <p className="text-lg font-semibold">
                {props.expiredMessage || "Registration is now closed."}
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-start justify-center gap-3 md:gap-4">
              <Digit value={timeLeft.days} label="Days" />
              <div className="mt-4 text-3xl font-bold text-muted-foreground/40 md:mt-5 md:text-4xl">:</div>
              <Digit value={timeLeft.hours} label="Hours" />
              <div className="mt-4 text-3xl font-bold text-muted-foreground/40 md:mt-5 md:text-4xl">:</div>
              <Digit value={timeLeft.minutes} label="Minutes" />
              <div className="mt-4 text-3xl font-bold text-muted-foreground/40 md:mt-5 md:text-4xl">:</div>
              <Digit value={timeLeft.seconds} label="Seconds" />
            </div>
          )}
        </div>

        {props.ctaLabel && (
          <div className="mt-10">
            <a
              href={props.ctaHref || "#"}
              className="inline-flex h-12 items-center justify-center rounded-xl px-8 text-sm font-semibold text-primary-foreground shadow-md transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: "var(--lp-primary, var(--primary))" }}
            >
              {props.ctaLabel}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
