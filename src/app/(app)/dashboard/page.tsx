import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  Contact,
  MapPin,
  Plus,
  Wallet,
} from "lucide-react";
import { format } from "date-fns";

import { PageHeader } from "@/components/primitives/page-header";
import { StatCard } from "@/components/primitives/stat-card";
import { StatusBadge } from "@/components/primitives/status-badge";
import { Button } from "@/components/ui/button";
import { LeadsOverTimeChart } from "@/components/charts/leads-over-time";
import { LeadSourcesBarChart } from "@/components/charts/lead-sources-bar";
import { RevenueOverTimeChart } from "@/components/charts/revenue-over-time";
import {
  getDashboardKpis,
  getLeadSourceMix,
  getLeadsPerDay,
  getRevenuePerDay,
  getUpcomingSessions,
} from "./kpis";
import { RecentActivity } from "./recent-activity";

export const metadata = { title: "Overview" };

const formatInt = new Intl.NumberFormat("en-US");

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

export default async function DashboardPage() {
  const kpis = await getDashboardKpis();
  const [leadsSeries, sourceMix, revenueSeries, upcomingSessions] =
    await Promise.all([
      getLeadsPerDay(30),
      getLeadSourceMix(6),
      getRevenuePerDay(kpis.revenue.currency, 30),
      getUpcomingSessions(5),
    ]);

  const hasLeadsData = leadsSeries.some((p) => p.leads > 0);
  const hasSourceData = sourceMix.length > 0;
  const hasRevenueData = revenueSeries.some((p) => p.revenue > 0);

  const revenueContext =
    kpis.revenue.otherCurrencies > 0
      ? `+${kpis.revenue.otherCurrencies} other ${
          kpis.revenue.otherCurrencies === 1 ? "currency" : "currencies"
        }`
      : "vs previous 30 days";

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Business at a glance"
        description="Registrations, leads, courses and revenue for the last 30 days."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/leads">
                <Contact /> View leads
              </Link>
            </Button>
            <Button asChild>
              <Link href="/courses/new">
                <Plus /> Create course
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex-1 space-y-6 p-6">
        {/* KPI row */}
        <section
          aria-label="Key metrics"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <StatCard
            label="New registrations"
            value={formatInt.format(kpis.newRegistrations.value)}
            icon={ClipboardList}
            deltaPct={kpis.newRegistrations.deltaPct}
            comparisonLabel={kpis.newRegistrations.comparisonLabel}
            context={kpis.newRegistrations.context}
            href="/sessions"
          />
          <StatCard
            label="Active courses"
            value={formatInt.format(kpis.activeCourses.value)}
            icon={BookOpen}
            deltaPct={kpis.activeCourses.deltaPct}
            comparisonLabel={kpis.activeCourses.comparisonLabel}
            href="/courses?status=PUBLISHED"
          />
          <StatCard
            label="New leads"
            value={formatInt.format(kpis.newLeads.value)}
            icon={Contact}
            deltaPct={kpis.newLeads.deltaPct}
            comparisonLabel={kpis.newLeads.comparisonLabel}
            context={kpis.newLeads.context}
            href="/leads"
          />
          <StatCard
            label={`Revenue (${kpis.revenue.currency})`}
            value={formatMoney(kpis.revenue.value, kpis.revenue.currency)}
            icon={Wallet}
            deltaPct={kpis.revenue.deltaPct}
            comparisonLabel={kpis.revenue.comparisonLabel}
            context={revenueContext}
            href="/payments?status=COMPLETED"
          />
        </section>

        {/* Charts row */}
        <section aria-label="Trends" className="grid gap-4 lg:grid-cols-5">
          <ChartCard
            className="lg:col-span-3"
            title="Leads over time"
            subtitle="Last 30 days"
          >
            {hasLeadsData ? (
              <LeadsOverTimeChart data={leadsSeries} />
            ) : (
              <ChartEmpty label="No leads created in the last 30 days." />
            )}
          </ChartCard>
          <ChartCard
            className="lg:col-span-2"
            title="Lead sources"
            subtitle="All-time top 6"
          >
            {hasSourceData ? (
              <LeadSourcesBarChart data={sourceMix} />
            ) : (
              <ChartEmpty label="No lead sources yet." />
            )}
          </ChartCard>
        </section>

        {/* Revenue chart + upcoming sessions */}
        <section
          aria-label="Revenue & schedule"
          className="grid gap-4 lg:grid-cols-5"
        >
          <ChartCard
            className="lg:col-span-3"
            title="Revenue over time"
            subtitle={`Completed payments · Last 30 days · ${kpis.revenue.currency}`}
          >
            {hasRevenueData ? (
              <RevenueOverTimeChart
                data={revenueSeries}
                currency={kpis.revenue.currency}
              />
            ) : (
              <ChartEmpty label="No completed payments in the last 30 days." />
            )}
          </ChartCard>

          <section className="lg:col-span-2 overflow-hidden rounded-xl border border-border/60 bg-card">
            <header className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <h2 className="text-sm font-semibold tracking-tight">
                Upcoming sessions
              </h2>
              <Link
                href="/sessions"
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                See all
              </Link>
            </header>
            {upcomingSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
                <CalendarDays className="size-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No sessions in the next 7 days.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/sessions?new=1">Add session</Link>
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {upcomingSessions.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/courses/${s.courseSlug}`}
                      className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                    >
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md border border-border/70 bg-muted/40 text-muted-foreground">
                        <CalendarDays className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium group-hover:underline">
                            {s.title?.trim() || s.courseName}
                          </span>
                          <StatusBadge status={s.status} />
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                          <span className="tabular-nums">
                            {format(s.startDate, "EEE, MMM d")}
                          </span>
                          {s.city ? (
                            <>
                              <span className="opacity-40">·</span>
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="size-3" />
                                {s.city}
                              </span>
                            </>
                          ) : null}
                          <span className="opacity-40">·</span>
                          <span className="tabular-nums">
                            {s.registrations}/{s.capacity}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </section>

        <RecentActivity />
      </div>
    </>
  );
}

function ChartCard({
  title,
  subtitle,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`overflow-hidden rounded-xl border border-border/60 bg-card ${className ?? ""}`}
    >
      <header className="flex items-baseline justify-between px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {subtitle ? (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </header>
      <div className="px-2 pb-3">{children}</div>
    </section>
  );
}

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-md border border-dashed border-border/70 bg-muted/20 text-xs text-muted-foreground">
      {label}
    </div>
  );
}
