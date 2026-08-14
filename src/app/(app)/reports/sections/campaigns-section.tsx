import Link from "next/link";
import { Megaphone } from "lucide-react";

import { StatusBadge } from "@/components/primitives/status-badge";
import type { TopCampaignRow } from "../actions";

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

export function CampaignsSection({ rows }: { rows: TopCampaignRow[] }) {
  return (
    <section className="rounded-xl border border-border/60 bg-card">
      <header className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <Megaphone className="size-4 text-muted-foreground" />
        <div>
          <h2 className="text-sm font-semibold tracking-tight">
            Top campaigns
          </h2>
          <p className="text-xs text-muted-foreground">
            Sorted by revenue attributed to captured students, then by leads
          </p>
        </div>
      </header>
      {rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          No campaigns captured any leads in this range.
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {rows.map((c) => (
            <li
              key={c.id}
              className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/campaigns/${c.id}`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {c.name}
                  </Link>
                  <StatusBadge status={c.status} />
                </div>
                {c.source ? (
                  <div className="truncate text-xs text-muted-foreground">
                    {c.source}
                  </div>
                ) : null}
              </div>
              <div className="text-end text-sm tabular-nums">
                <span className="font-medium">{c.leads}</span>
                <div className="text-xs text-muted-foreground">leads</div>
              </div>
              <div className="text-end text-sm tabular-nums">
                <span className="font-medium">{c.converted}</span>
                <div className="text-xs text-muted-foreground">converted</div>
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
