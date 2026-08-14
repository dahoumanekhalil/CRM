import Link from "next/link";
import { BookOpen } from "lucide-react";

import type { TopCourseRow } from "../actions";

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount).toLocaleString()} ${currency}`;
  }
}

export function CoursesSection({ rows }: { rows: TopCourseRow[] }) {
  return (
    <section className="rounded-xl border border-border/60 bg-card">
      <header className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <BookOpen className="size-4 text-muted-foreground" />
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Top courses</h2>
          <p className="text-xs text-muted-foreground">
            Sorted by revenue in range, then by new registrations
          </p>
        </div>
      </header>
      {rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          No registrations in this range.
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {rows.map((c) => (
            <li
              key={c.id}
              className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center"
            >
              <div className="min-w-0">
                <Link
                  href={`/courses/${c.slug}`}
                  className="truncate text-sm font-medium hover:underline"
                >
                  {c.name}
                </Link>
                {c.category ? (
                  <div className="truncate text-xs text-muted-foreground">
                    {c.category}
                  </div>
                ) : null}
              </div>
              <div className="text-end text-sm tabular-nums">
                <span className="font-medium">{c.registrations}</span>
                <div className="text-xs text-muted-foreground">
                  registrations
                </div>
              </div>
              <div className="text-end text-sm tabular-nums">
                <span className="font-medium">{c.attendedSessions}</span>
                <div className="text-xs text-muted-foreground">attended</div>
              </div>
              <div className="text-end text-sm tabular-nums">
                <span className="font-medium">
                  {c.revenueTop
                    ? formatMoney(c.revenueTop.amount, c.revenueTop.currency)
                    : "—"}
                </span>
                <div className="text-xs text-muted-foreground">revenue</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
