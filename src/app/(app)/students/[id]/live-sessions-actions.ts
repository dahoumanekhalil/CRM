"use server";

import { prisma } from "@/lib/prisma";
import { requirePermissionAction } from "@/lib/auth-guards";

export type StudentLiveSessionRow = {
  liveSessionId: string;
  courseSessionId: string;
  courseSlug: string;
  courseName: string;
  sessionTitle: string;
  liveStatus: string;
  scheduledAt: Date | null;
  startedAt: Date | null;
  endedAt: Date | null;
  hasRecording: boolean;
  registrationStatus: string;
};

const ENDED_STATUSES = new Set(["ENDED", "COMPLETED", "CANCELLED", "RECORDING_PROCESSING"]);

export async function getStudentLiveSessions(studentId: string): Promise<{
  upcoming: StudentLiveSessionRow[];
  past: StudentLiveSessionRow[];
}> {
  await requirePermissionAction("students.view");

  const registrations = await prisma.registration.findMany({
    where: {
      studentId,
      session: { liveSessions: { some: {} } },
    },
    select: {
      status: true,
      session: {
        select: {
          id: true,
          title: true,
          course: { select: { name: true, slug: true } },
          // Fetch only the most recent live session per course session.
          liveSessions: {
            select: {
              id: true,
              status: true,
              scheduledAt: true,
              startedAt: true,
              endedAt: true,
              recordingUrl: true,
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { session: { startDate: "desc" } },
  });

  const rows: StudentLiveSessionRow[] = registrations
    .filter((r) => r.session.liveSessions.length > 0)
    .map((r) => {
      const ls = r.session.liveSessions[0]!;
      return {
        liveSessionId: ls.id,
        courseSessionId: r.session.id,
        courseSlug: r.session.course.slug,
        courseName: r.session.course.name,
        sessionTitle: r.session.title ?? "Session",
        liveStatus: ls.status as string,
        scheduledAt: ls.scheduledAt,
        startedAt: ls.startedAt,
        endedAt: ls.endedAt,
        hasRecording: !!ls.recordingUrl,
        registrationStatus: r.status as string,
      };
    });

  return {
    upcoming: rows.filter((r) => !ENDED_STATUSES.has(r.liveStatus)),
    past: rows.filter((r) => ENDED_STATUSES.has(r.liveStatus)),
  };
}
