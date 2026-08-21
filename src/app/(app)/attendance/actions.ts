"use server";

import { revalidatePath } from "next/cache";
import type { Prisma, SessionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermissionAction } from "@/lib/auth-guards";
import {
  listAttendanceSchema,
  recordAttendanceSchema,
  type ListAttendanceInput,
  type RecordAttendanceInput,
} from "@/lib/schemas/attendance";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session;
}

// yyyy-MM-dd string → UTC Date at midnight (matches Prisma's @db.Date behavior).
function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split("-").map((v) => Number.parseInt(v, 10));
  return new Date(Date.UTC(y, (m ?? 1) - 1, d));
}

function toDateOnly(d: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Every calendar day between start and end, inclusive. Used to know which
// dates a multi-day session can record attendance for.
function sessionDays(startDate: Date, endDate: Date): string[] {
  const out: string[] = [];
  const start = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate()
  );
  const end = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate()
  );
  const cur = new Date(start);
  while (cur.getTime() <= end.getTime()) {
    out.push(toDateOnly(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

async function bumpSessionStatus(
  sessionId: string,
  recordedDate: Date
): Promise<void> {
  const session = await prisma.courseSession.findUnique({
    where: { id: sessionId },
    select: { id: true, status: true, startDate: true, endDate: true },
  });
  if (!session) return;

  const daysInSession = sessionDays(session.startDate, session.endDate);
  const isLastDay = daysInSession.at(-1) === toDateOnly(recordedDate);

  // Roll UPCOMING/OPEN/FULL → IN_PROGRESS when the first attendance lands.
  const preRunStatuses: SessionStatus[] = ["UPCOMING", "OPEN", "FULL", "DRAFT"];
  const nextStatus: SessionStatus | null = isLastDay
    ? "COMPLETED"
    : preRunStatuses.includes(session.status)
    ? "IN_PROGRESS"
    : null;

  if (nextStatus && nextStatus !== session.status) {
    await prisma.courseSession.update({
      where: { id: sessionId },
      data: { status: nextStatus },
    });
  }
}

export async function recordAttendance(
  input: RecordAttendanceInput
): Promise<Result<{ count: number }>> {
  const parsed = recordAttendanceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const session = await requirePermissionAction("attendance.write");
  const d = parsed.data;
  const sessionDate = parseDateOnly(d.sessionDate);

  const courseSession = await prisma.courseSession.findUnique({
    where: { id: d.sessionId },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      course: { select: { slug: true } },
    },
  });
  if (!courseSession) return { ok: false, error: "Session not found." };

  const validDays = sessionDays(
    courseSession.startDate,
    courseSession.endDate
  );
  if (!validDays.includes(d.sessionDate)) {
    return {
      ok: false,
      error: "That date is outside the session's schedule.",
    };
  }

  // Guard: every registrationId in the payload must actually belong to this
  // session. Cheap sanity check that stops mis-routed writes.
  const regIds = d.entries.map((e) => e.registrationId);
  if (regIds.length > 0) {
    const validRegs = await prisma.registration.count({
      where: { id: { in: regIds }, sessionId: d.sessionId },
    });
    if (validRegs !== regIds.length) {
      return {
        ok: false,
        error: "One or more registrations don't belong to this session.",
      };
    }
  }

  try {
    await prisma.$transaction(
      d.entries.map((e) =>
        prisma.attendance.upsert({
          where: {
            registrationId_sessionDate: {
              registrationId: e.registrationId,
              sessionDate,
            },
          },
          create: {
            registrationId: e.registrationId,
            sessionId: d.sessionId,
            sessionDate,
            status: e.status,
            notes: e.notes.trim() === "" ? null : e.notes,
            recordedById: session.user.id,
            recordedAt: new Date(),
          },
          update: {
            status: e.status,
            notes: e.notes.trim() === "" ? null : e.notes,
            recordedById: session.user.id,
            recordedAt: new Date(),
          },
        })
      )
    );

    await bumpSessionStatus(d.sessionId, sessionDate);

    revalidatePath("/attendance");
    revalidatePath("/sessions");
    if (courseSession.course?.slug) {
      revalidatePath(`/courses/${courseSession.course.slug}`);
    }
    return { ok: true, data: { count: d.entries.length } };
  } catch (err) {
    console.error("recordAttendance failed", err);
    return {
      ok: false,
      error: "Couldn't save attendance. Please try again.",
    };
  }
}

// Rolled-up attendance for a specific session + day. Merges registered
// students with any existing attendance entries so the dialog can render
// the full roster in one pass.
export async function getSessionRosterForDate(
  sessionId: string,
  dateStr: string
) {
  await requireSession();
  const session = await prisma.courseSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      title: true,
      startDate: true,
      endDate: true,
      capacity: true,
      course: { select: { id: true, name: true, slug: true } },
    },
  });
  if (!session) return null;

  const sessionDate = parseDateOnly(dateStr);
  const registrations = await prisma.registration.findMany({
    where: {
      sessionId,
      status: {
        in: ["PENDING", "CONFIRMED", "ATTENDING", "COMPLETED"],
      },
    },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      attendance: {
        where: { sessionDate },
        select: { status: true, notes: true },
      },
    },
    orderBy: { registeredAt: "asc" },
  });

  return {
    session: {
      id: session.id,
      title: session.title,
      startDate: session.startDate,
      endDate: session.endDate,
      capacity: session.capacity,
      courseName: session.course.name,
      courseSlug: session.course.slug,
      days: sessionDays(session.startDate, session.endDate),
    },
    entries: registrations.map((r) => ({
      registrationId: r.id,
      student: r.student,
      registrationStatus: r.status,
      existingStatus: r.attendance[0]?.status ?? null,
      existingNotes: r.attendance[0]?.notes ?? null,
    })),
  };
}

export type SessionRoster = NonNullable<
  Awaited<ReturnType<typeof getSessionRosterForDate>>
>;

// Feeds the `/attendance` list route. Returns sessions with a "priority" so
// the client can group them: today, in-progress, upcoming (this week), past.
export async function listSessionsForAttendance(input: ListAttendanceInput) {
  const parsed = listAttendanceSchema.parse(input);
  await requireSession();

  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const weekAhead = new Date(todayStart);
  weekAhead.setDate(weekAhead.getDate() + 7);
  const weekBack = new Date(todayStart);
  weekBack.setDate(weekBack.getDate() - 14);

  const where: Prisma.CourseSessionWhereInput = {};
  if (parsed.courseId) where.courseId = parsed.courseId;
  if (parsed.q) {
    const term = parsed.q.trim();
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { location: { contains: term, mode: "insensitive" } },
      { city: { contains: term, mode: "insensitive" } },
      { course: { name: { contains: term, mode: "insensitive" } } },
    ];
  }

  if (parsed.when === "TODAY") {
    where.AND = [
      { startDate: { lte: todayEnd } },
      { endDate: { gte: todayStart } },
    ];
  } else if (parsed.when === "IN_PROGRESS") {
    where.status = "IN_PROGRESS";
  } else if (parsed.when === "UPCOMING") {
    where.startDate = { gte: todayStart, lte: weekAhead };
    where.status = { notIn: ["CANCELLED", "COMPLETED"] };
  } else if (parsed.when === "PAST") {
    where.endDate = { gte: weekBack, lt: todayStart };
  } else {
    // ALL — clamp to a reasonable window so the list doesn't page forever.
    where.endDate = { gte: weekBack };
  }

  const rows = await prisma.courseSession.findMany({
    where,
    orderBy: [{ startDate: "asc" }],
    take: 100,
    include: {
      course: { select: { id: true, name: true, slug: true } },
      instructor: { select: { firstName: true, lastName: true } },
      _count: {
        select: {
          registrations: {
            where: {
              status: {
                in: ["PENDING", "CONFIRMED", "ATTENDING", "COMPLETED"],
              },
            },
          },
        },
      },
    },
  });

  // For "today", also compute today's attendance counts per session so the
  // list can show "N/M attended today". One aggregate query is enough since
  // the rows list is bounded.
  const ids = rows.map((r) => r.id);
  const todayAttendance =
    ids.length === 0
      ? new Map<string, number>()
      : await prisma.attendance
          .groupBy({
            by: ["sessionId"],
            where: {
              sessionId: { in: ids },
              sessionDate: todayStart,
              status: { in: ["PRESENT", "LATE"] },
            },
            _count: { _all: true },
          })
          .then(
            (grouped) =>
              new Map(grouped.map((g) => [g.sessionId, g._count._all]))
          );

  const priorityOf = (
    startDate: Date,
    endDate: Date,
    status: SessionStatus
  ): "today" | "in-progress" | "upcoming" | "past" => {
    if (startDate <= todayEnd && endDate >= todayStart) return "today";
    if (status === "IN_PROGRESS") return "in-progress";
    if (startDate > now) return "upcoming";
    return "past";
  };

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    startDate: r.startDate,
    endDate: r.endDate,
    city: r.city,
    country: r.country,
    location: r.location,
    status: r.status,
    course: r.course,
    instructorName: r.instructor
      ? [r.instructor.firstName, r.instructor.lastName].filter(Boolean).join(" ") || null
      : null,
    registrations: r._count.registrations,
    todayPresent: todayAttendance.get(r.id) ?? 0,
    priority: priorityOf(r.startDate, r.endDate, r.status),
    days: sessionDays(r.startDate, r.endDate),
  }));
}

export type AttendanceListRow = Awaited<
  ReturnType<typeof listSessionsForAttendance>
>[number];

// Cheap picker for the course filter on /attendance.
export async function listCoursesForAttendanceFilter() {
  await requireSession();
  return prisma.course.findMany({
    where: { status: { in: ["PUBLISHED", "DRAFT"] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export type AttendanceCoursePickerItem = Awaited<
  ReturnType<typeof listCoursesForAttendanceFilter>
>[number];
