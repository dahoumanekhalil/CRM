import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Contact,
  MapPin,
  Wallet,
} from "lucide-react";
import { format } from "date-fns";

import { auth } from "@/auth";
import { StatCard } from "@/components/primitives/stat-card";
import { StatusBadge } from "@/components/primitives/status-badge";
import { Button } from "@/components/ui/button";
import { LeadsOverTimeChart } from "@/components/charts/leads-over-time";
import { LeadSourcesBarChart } from "@/components/charts/lead-sources-bar";
import { RevenueOverTimeChart } from "@/components/charts/revenue-over-time";
import { cn } from "@/lib/utils";

import {
  getDashboardKpis,
  getLeadSourceMix,
  getLeadsPerDay,
  getRevenuePerDay,
  getUpcomingSessions,
} from "./kpis";
import { getWorkdayData } from "./workday";
import { PriorityTasksCard } from "./priority-tasks-card";
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

function getGreeting(name: string, totalCount: number) {
  const hour = new Date().getHours();
  const period = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const firstName = name.split(/\s+/)[0] ?? name;
  const salutation = `Good ${period}, ${firstName}.`;
  const allGood = totalCount === 0;
  const summary = allGood
    ? "Everything looks good today."
    : `You have ${totalCount} ${totalCount === 1 ? "thing" : "things"} that need your attention today.`;
  return { salutation, summary, allGood };
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id ?? "";
  const role = session?.user?.role ?? undefined;
  const userName = session?.user?.name ?? session?.user?.email ?? "there";

  // KPIs must resolve first — revenue chart depends on the top currency.
  const kpis = await getDashboardKpis();

  const [workday, leadsSeries, sourceMix, revenueSeries, upcomingSessions] =
    await Promise.all([
      getWorkdayData(userId, role),
      getLeadsPerDay(30),
      getLeadSourceMix(6),
      getRevenuePerDay(kpis.revenue.currency, 30),
      getUpcomingSessions(5),
    ]);

  const totalAttentionCount = workday.attentionItems.reduce(
    (s, i) => s + i.count,
    0
  );
  const greeting = getGreeting(userName, totalAttentionCount);

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
    <div className="flex-1">
      {/* ── Greeting ──────────────────────────────────────────── */}
      <header className="border-b border-border/60 px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting.salutation}
        </h1>
        <p
          className={cn(
            "mt-1 text-sm",
            greeting.allGood
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground"
          )}
        >
          {greeting.summary}
        </p>
      </header>

      <div className="space-y-10 px-6 py-8">
        {/* ── Attention center ──────────────────────────────────── */}
        <section aria-label="Attention center">
          <SectionLabel>Needs attention</SectionLabel>
          {workday.attentionItems.length === 0 ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card px-4 py-4 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
              Everything looks good. No immediate actions required.
            </div>
          ) : (
            <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card">
              {workday.attentionItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {item.count}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {item.label}
                    </span>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                    View
                    <ArrowRight className="size-3" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── Today's schedule ──────────────────────────────────── */}
        {workday.todaySessions.length > 0 ? (
          <section aria-label="Today's schedule">
            <div className="mb-3 flex items-center justify-between">
              <SectionLabel className="mb-0">Today&apos;s schedule</SectionLabel>
              <Link
                href="/sessions"
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                View all
              </Link>
            </div>
            <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card">
              {workday.todaySessions.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/courses/${s.courseSlug}`}
                    className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40"
                  >
                    <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium group-hover:underline">
                      {s.name}
                    </span>
                    <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground tabular-nums">
                      <span>
                        {s.startTime} – {s.endTime}
                      </span>
                      <span className="opacity-40">·</span>
                      <span>{s.studentCount} students</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* ── Priority tasks ────────────────────────────────────── */}
        <section aria-label="Priority tasks">
          <div className="mb-3 flex items-center justify-between">
            <SectionLabel className="mb-0">Priority tasks</SectionLabel>
            <Link
              href="/tasks"
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              View all
            </Link>
          </div>
          <PriorityTasksCard tasks={workday.priorityTasks} />
        </section>

        {/* ── Business overview ─────────────────────────────────── */}
        <section aria-label="Business overview" className="space-y-6">
          <SectionLabel>Business overview</SectionLabel>

          {/* KPI row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          </div>

          {/* Charts row 1 */}
          <div className="grid gap-4 lg:grid-cols-5">
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
          </div>

          {/* Charts row 2 + upcoming sessions */}
          <div className="grid gap-4 lg:grid-cols-5">
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

            <section className="overflow-hidden rounded-xl border border-border/60 bg-card lg:col-span-2">
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
          </div>

          <RecentActivity />
        </section>
      </div>
    </div>
  );
}

function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70",
        className
      )}
    >
      {children}
    </h2>
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
      className={cn(
        "overflow-hidden rounded-xl border border-border/60 bg-card",
        className
      )}
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
