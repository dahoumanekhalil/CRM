"use server";

import { prisma } from "@/lib/prisma";
import { requirePermissionAction } from "@/lib/auth-guards";
import { joinAsObserver } from "@/app/(app)/courses/[slug]/sessions/[sessionId]/live-session-actions";

export type LiveSessionListRow = {
  id: string;
  status: string;
  scheduledAt: Date | null;
  startedAt: Date | null;
  endedAt: Date | null;
  peakParticipants: number;
  totalJoins: number;
  hasRecording: boolean;
  courseSessionId: string;
  courseSessionTitle: string;
  courseName: string;
  courseSlug: string;
};

const SESSION_SELECT = {
  id: true,
  status: true,
  scheduledAt: true,
  startedAt: true,
  endedAt: true,
  peakParticipants: true,
  totalJoins: true,
  recordingUrl: true,
  courseSession: {
    select: {
      id: true,
      title: true,
      course: { select: { name: true, slug: true } },
    },
  },
} as const;

function toRow(r: {
  id: string;
  scheduledAt: Date | null;
  startedAt: Date | null;
  endedAt: Date | null;
  peakParticipants: number;
  totalJoins: number;
  recordingUrl: string | null;
  courseSession: { id: string; title: string | null; course: { name: string; slug: string } };
  status: string;
}): LiveSessionListRow {
  return {
    id: r.id,
    status: r.status,
    scheduledAt: r.scheduledAt,
    startedAt: r.startedAt,
    endedAt: r.endedAt,
    peakParticipants: r.peakParticipants,
    totalJoins: r.totalJoins,
    hasRecording: !!r.recordingUrl,
    courseSessionId: r.courseSession.id,
    courseSessionTitle: r.courseSession.title ?? "Session",
    courseName: r.courseSession.course.name,
    courseSlug: r.courseSession.course.slug,
  };
}

// 28.1 — All currently-active (LIVE / WAITING) sessions across all courses.
export async function getActiveLiveSessions(): Promise<LiveSessionListRow[]> {
  await requirePermissionAction("live.view");

  const rows = await prisma.liveSession.findMany({
    where: { status: { in: ["LIVE", "WAITING"] } },
    orderBy: { startedAt: "desc" },
    select: SESSION_SELECT,
  });

  return rows.map((r) => toRow({ ...r, status: r.status as string }));
}

// 28.2 — Filterable session history for the manager oversight page.
export async function getLiveSessionHistory(opts?: {
  limit?: number;
  offset?: number;
}): Promise<LiveSessionListRow[]> {
  await requirePermissionAction("live.view");

  const rows = await prisma.liveSession.findMany({
    where: { status: { in: ["ENDED", "COMPLETED", "RECORDING_PROCESSING", "CANCELLED"] } },
    orderBy: { endedAt: "desc" },
    take: opts?.limit ?? 50,
    skip: opts?.offset ?? 0,
    select: SESSION_SELECT,
  });

  return rows.map((r) => toRow({ ...r, status: r.status as string }));
}

// Re-export so the page can use joinAsObserver without a separate import.
export { joinAsObserver };
