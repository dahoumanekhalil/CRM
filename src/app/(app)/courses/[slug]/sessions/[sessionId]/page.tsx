import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { ChevronRight, ClipboardCheck, MapPin, User } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/primitives/status-badge";
import { Button } from "@/components/ui/button";
import { getSessionRoster, getLeadsForSession } from "./actions";
import { getLiveSession } from "./live-session-actions";
import { RosterClient } from "./roster-client";
import { SessionTabsView } from "./session-tabs";
import { SessionOverviewTab } from "./session-overview-tab";
import { SessionLeadsTab } from "./session-leads-tab";
import { SessionLiveTab } from "./session-live-tab";
import { SessionPaymentsTab } from "./session-payments-tab";
import { SessionFinancialsTab } from "./session-financials-tab";
import { SessionActivityTab } from "./session-activity-tab";

type Params = Promise<{ slug: string; sessionId: string }>;

/** Returns "Course Name G3" sorted by startDate asc, skipping cancelled. */
async function resolveGroupLabel(courseId: string, sessionId: string, courseName: string) {
  const siblings = await prisma.courseSession.findMany({
    where: { courseId, status: { not: "CANCELLED" } },
    orderBy: { startDate: "asc" },
    select: { id: true },
  });
  const idx = siblings.findIndex((s) => s.id === sessionId);
  return idx >= 0 ? `${courseName} G${idx + 1}` : courseName;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { sessionId } = await params;
  const roster = await getSessionRoster(sessionId);
  if (!roster) return { title: "Session" };
  const label = await resolveGroupLabel(roster.course.id, sessionId, roster.course.name);
  return {
    title: `${label}`,
    description: `Students, attendance and payments for ${label}`,
  };
}

export default async function SessionRosterPage({ params }: { params: Params }) {
  const { slug, sessionId } = await params;
  const [roster, leads, liveSession] = await Promise.all([
    getSessionRoster(sessionId),
    getLeadsForSession(sessionId),
    getLiveSession(sessionId).catch(() => null),
  ]);

  if (!roster || roster.course.slug !== slug) notFound();

  const groupLabel = await resolveGroupLabel(roster.course.id, sessionId, roster.course.name);

  const instructor = roster.instructor
    ? [roster.instructor.firstName, roster.instructor.lastName].filter(Boolean).join(" ")
    : null;
  const location =
    [roster.city, roster.country].filter(Boolean).join(", ") || roster.location || null;
  const currency = roster.course.currency || "DZD";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/courses" className="transition-colors hover:text-foreground">
          Courses
        </Link>
        <ChevronRight className="size-3.5" />
        <Link
          href={`/courses/${slug}`}
          className="transition-colors hover:text-foreground"
        >
          {roster.course.name}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="font-medium text-foreground">{groupLabel}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{groupLabel}</h1>
            <StatusBadge status={roster.status} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="tabular-nums">
              {format(roster.startDate, "EEEE, MMMM d, yyyy")}
              {roster.endDate &&
                roster.endDate.toDateString() !== roster.startDate.toDateString() &&
                ` → ${format(roster.endDate, "MMM d, yyyy")}`}
            </span>
            <span className="tabular-nums">
              {format(roster.startDate, "HH:mm")}
              {roster.endDate && ` – ${format(roster.endDate, "HH:mm")}`}
            </span>
            {location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" />
                {location}
              </span>
            )}
            {instructor && (
              <span className="inline-flex items-center gap-1">
                <User className="size-3.5" />
                {instructor}
              </span>
            )}
            <span className="tabular-nums">
              {roster.registrations.length} / {roster.capacity ?? "∞"} enrolled
            </span>
          </div>
        </div>
        {/* Quick actions */}
        <Link href={`?tab=students`}>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
            <ClipboardCheck className="size-4" />
            Take Attendance
          </Button>
        </Link>
      </div>

      {/* Tabbed content — server slots rendered inside client tabs */}
      <SessionTabsView
        enrolledCount={roster.registrations.length}
        leadsCount={leads.length}
        isLive={liveSession?.status === "LIVE"}
        overviewSlot={
          <SessionOverviewTab sessionId={sessionId} roster={roster} />
        }
        studentsSlot={<RosterClient roster={roster} groupLabel={groupLabel} />}
        leadsSlot={<SessionLeadsTab sessionId={sessionId} />}
        paymentsSlot={
          <SessionPaymentsTab sessionId={sessionId} currency={currency} />
        }
        financialsSlot={<SessionFinancialsTab sessionId={sessionId} />}
        liveSlot={
          <SessionLiveTab
            sessionId={sessionId}
            courseSlug={slug}
            sessionStartDate={roster.startDate}
          />
        }
        activitySlot={<SessionActivityTab sessionId={sessionId} />}
      />
    </div>
  );
}
