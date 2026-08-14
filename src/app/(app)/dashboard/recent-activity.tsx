import "server-only";
import Link from "next/link";
import { format, formatDistanceToNowStrict } from "date-fns";
import {
  ArrowUpRight,
  CalendarDays,
  ClipboardList,
  Contact,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/primitives/status-badge";
import { cn } from "@/lib/utils";

const RECENT_LIMIT = 5;

export async function RecentActivity() {
  const [leads, registrations] = await Promise.all([
    prisma.lead.findMany({
      take: RECENT_LIMIT,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        status: true,
        source: true,
        createdAt: true,
        course: { select: { name: true } },
      },
    }),
    prisma.registration.findMany({
      take: RECENT_LIMIT,
      orderBy: { registeredAt: "desc" },
      select: {
        id: true,
        status: true,
        registeredAt: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        session: {
          select: {
            id: true,
            title: true,
            startDate: true,
            course: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    }),
  ]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Recent leads */}
      <ActivityColumn
        title="Recent leads"
        emptyLabel="No leads yet. Forms on landing pages will capture them here."
        seeAllHref="/leads"
      >
        {leads.length === 0 ? null : (
          <ul className="divide-y divide-border/60">
            {leads.map((lead) => {
              const name =
                [lead.firstName, lead.lastName].filter(Boolean).join(" ") ||
                "Unnamed lead";
              return (
                <li key={lead.id}>
                  <Link
                    href={`/leads/${lead.id}`}
                    className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                      <Contact className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {name}
                        </span>
                        <StatusBadge status={lead.status} />
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {lead.course?.name ? (
                          <>
                            <span>{lead.course.name}</span>
                            <span className="mx-1.5 opacity-40">·</span>
                          </>
                        ) : lead.source ? (
                          <>
                            <span>{lead.source}</span>
                            <span className="mx-1.5 opacity-40">·</span>
                          </>
                        ) : null}
                        {formatAgo(lead.createdAt)}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </ActivityColumn>

      {/* Recent registrations */}
      <ActivityColumn
        title="Recent registrations"
        emptyLabel="No session registrations yet. Register students from their profile or a session."
        seeAllHref="/sessions"
      >
        {registrations.length === 0 ? null : (
          <ul className="divide-y divide-border/60">
            {registrations.map((reg) => {
              const studentName =
                [reg.student.firstName, reg.student.lastName]
                  .filter(Boolean)
                  .join(" ") ||
                reg.student.email ||
                "Unnamed student";
              const sessionLabel =
                reg.session.title?.trim() || reg.session.course.name;
              return (
                <li key={reg.id}>
                  <Link
                    href={`/students/${reg.student.id}`}
                    className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                      <ClipboardList className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {studentName}
                        </span>
                        <StatusBadge status={reg.status} />
                      </div>
                      <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays className="size-3 shrink-0" />
                        <span className="truncate">
                          {sessionLabel} ·{" "}
                          {format(reg.session.startDate, "MMM d")}
                        </span>
                        <span className="shrink-0 opacity-40">·</span>
                        <span className="shrink-0">
                          {formatAgo(reg.registeredAt)}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </ActivityColumn>
    </div>
  );
}

function ActivityColumn({
  title,
  emptyLabel,
  seeAllHref,
  children,
}: {
  title: string;
  emptyLabel: string;
  seeAllHref: string;
  children: React.ReactNode;
}) {
  const isEmpty = !children;
  return (
    <section className="overflow-hidden rounded-xl border border-border/60 bg-card">
      <header className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        <Link
          href={seeAllHref}
          className={cn(
            "inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          )}
        >
          See all
          <ArrowUpRight className="size-3" />
        </Link>
      </header>
      {isEmpty ? (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        children
      )}
    </section>
  );
}

function formatAgo(date: Date): string {
  const abs = formatDistanceToNowStrict(date, { addSuffix: false });
  return `${abs} ago`;
}
