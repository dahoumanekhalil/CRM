import { formatDistanceToNow } from "date-fns";
import {
  BadgeCheck,
  Calendar,
  Contact,
  GraduationCap,
  Megaphone,
  UserX,
  Wallet,
} from "lucide-react";
import type { CampaignDetail, CampaignMetrics } from "../actions";

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

export function OverviewTab({
  campaign,
  metrics,
}: {
  campaign: CampaignDetail;
  metrics: CampaignMetrics;
}) {
  const conversionRate =
    metrics.totalLeads > 0
      ? Math.round((metrics.convertedLeads / metrics.totalLeads) * 1000) / 10
      : 0;

  const topRevenue = Object.entries(metrics.revenueByCurrency).sort(
    (a, b) => b[1] - a[1]
  )[0];

  const kpis = [
    {
      label: "Leads captured",
      value: metrics.totalLeads.toString(),
      icon: Contact,
    },
    {
      label: "Converted",
      value: metrics.convertedLeads.toString(),
      subtext: metrics.totalLeads > 0 ? `${conversionRate}% rate` : "—",
      icon: BadgeCheck,
    },
    {
      label: "Students",
      value: metrics.distinctStudents.toString(),
      icon: GraduationCap,
    },
    {
      label: "Revenue",
      value: topRevenue
        ? formatMoney(topRevenue[1], topRevenue[0])
        : "—",
      subtext:
        Object.keys(metrics.revenueByCurrency).length > 1
          ? `+${Object.keys(metrics.revenueByCurrency).length - 1} other ${
              Object.keys(metrics.revenueByCurrency).length - 1 === 1
                ? "currency"
                : "currencies"
            }`
          : undefined,
      icon: Wallet,
    },
  ];

  const facts: Array<{ label: string; value: string; icon: typeof Megaphone }> =
    [
      { label: "Source", value: campaign.source ?? "—", icon: Megaphone },
      {
        label: "Budget",
        value:
          campaign.budget !== null
            ? new Intl.NumberFormat().format(campaign.budget)
            : "—",
        icon: Wallet,
      },
      {
        label: "Starts",
        value: campaign.startDate
          ? campaign.startDate.toISOString().slice(0, 10)
          : "—",
        icon: Calendar,
      },
      {
        label: "Ends",
        value: campaign.endDate
          ? campaign.endDate.toISOString().slice(0, 10)
          : "—",
        icon: Calendar,
      },
      {
        label: "Created",
        value: formatDistanceToNow(campaign.createdAt, { addSuffix: true }),
        icon: Calendar,
      },
      {
        label: "Unsubscribed",
        value: metrics.unsubscribed.toString(),
        icon: UserX,
      },
    ];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <section
          aria-label="Metrics"
          className="grid grid-cols-2 divide-x divide-border/60 rounded-xl border border-border/60 bg-card sm:grid-cols-4"
        >
          {kpis.map((k) => (
            <div key={k.label} className="flex flex-col gap-1 px-5 py-4">
              <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <k.icon className="size-3.5" /> {k.label}
              </span>
              <span className="text-2xl font-semibold tabular-nums">
                {k.value}
              </span>
              {k.subtext ? (
                <span className="text-xs text-muted-foreground">
                  {k.subtext}
                </span>
              ) : null}
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-border/60 bg-card p-6">
          <h2 className="mb-3 text-sm font-semibold tracking-tight">
            About this campaign
          </h2>
          {campaign.description ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {campaign.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No description yet. Edit the campaign to add one — helpful
              context for whoever runs the next report.
            </p>
          )}
        </section>
      </div>

      <aside className="space-y-4">
        <section className="rounded-xl border border-border/60 bg-card">
          <header className="border-b border-border/60 px-5 py-3">
            <h2 className="text-sm font-semibold tracking-tight">Key facts</h2>
          </header>
          <dl className="divide-y divide-border/60">
            {facts.map((f) => (
              <div
                key={f.label}
                className="flex items-start justify-between gap-4 px-5 py-3"
              >
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <f.icon className="size-3.5" />
                  {f.label}
                </dt>
                <dd className="max-w-[60%] truncate text-end text-sm font-medium">
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </aside>
    </div>
  );
}
