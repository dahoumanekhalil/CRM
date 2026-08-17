import "server-only";
import { startOfDay, endOfDay, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

export interface AttentionItem {
  count: number;
  label: string;
  href: string;
}

export interface TodaySession {
  id: string;
  name: string;
  courseSlug: string;
  startTime: string;
  endTime: string;
  studentCount: number;
}

export interface PriorityTask {
  id: string;
  title: string;
  dueDate: string | null;
  isOverdue: boolean;
  status: string;
}

export interface WorkdayData {
  attentionItems: AttentionItem[];
  todaySessions: TodaySession[];
  priorityTasks: PriorityTask[];
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function fmtTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Payments that have been PENDING for more than this many days are "overdue".
const PAYMENT_OVERDUE_DAYS = 7;

export async function getWorkdayData(
  userId: string,
  role: string | undefined
): Promise<WorkdayData> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const tomorrow = new Date(todayStart.getTime() + 86_400_000);
  // Look back 3 days for sessions that may need attendance recorded.
  const attendanceWindow = startOfDay(subDays(now, 3));
  const paymentOverdueCutoff = subDays(now, PAYMENT_OVERDUE_DAYS);

  const isManager = hasPermission(role, "reports.view");
  const canViewLeads = hasPermission(role, "leads.view");
  const canViewPayments = hasPermission(role, "payments.view");
  const canViewLandingPages = hasPermission(role, "landing-pages.view");
  const canViewAttendance = hasPermission(role, "attendance.view");
  const ownerFilter = !isManager ? { ownerId: userId } : {};

  const [
    followUpCount,
    pendingPaymentCount,
    overduePaymentCount,
    draftPageCount,
    pendingAttendanceCount,
    overdueTaskCount,
    todaySessions,
    priorityTasks,
  ] = await Promise.all([
    // ── Sales-side: leads with a next action pending ─────────────────────────
    canViewLeads
      ? prisma.lead.count({
          where: {
            nextAction: { not: null },
            status: { notIn: ["REGISTERED", "LOST"] },
          },
        })
      : Promise.resolve(0),

    // ── Finance-side: payments awaiting confirmation ──────────────────────────
    canViewPayments
      ? prisma.payment.count({ where: { status: "PENDING" } })
      : Promise.resolve(0),

    // ── Finance-side: payments that have been PENDING for too long ────────────
    canViewPayments
      ? prisma.payment.count({
          where: {
            status: "PENDING",
            createdAt: { lt: paymentOverdueCutoff },
          },
        })
      : Promise.resolve(0),

    // ── Marketing-side: landing pages still in draft ──────────────────────────
    canViewLandingPages
      ? prisma.landingPage.count({ where: { status: "DRAFT" } })
      : Promise.resolve(0),

    // ── Trainer-side: sessions in the last 3 days with no attendance today ────
    // A session "needs attendance" if it has confirmed students but no attendance
    // record has been filed for any date in the last 3 days.
    canViewAttendance
      ? prisma.courseSession.count({
          where: {
            startDate: { gte: attendanceWindow, lte: todayEnd },
            status: { notIn: ["CANCELLED", "DRAFT"] },
            registrations: {
              some: { status: { in: ["CONFIRMED", "ATTENDING"] } },
            },
            attendance: {
              none: {
                sessionDate: { gte: todayStart, lt: tomorrow },
              },
            },
          },
        })
      : Promise.resolve(0),

    // ── All roles: tasks past their due date (ownership-scoped) ───────────────
    prisma.task.count({
      where: {
        dueDate: { lt: todayStart },
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        ...ownerFilter,
      },
    }),

    // ── All roles: sessions running today ─────────────────────────────────────
    prisma.courseSession.findMany({
      where: {
        startDate: { gte: todayStart, lte: todayEnd },
        status: { notIn: ["CANCELLED", "DRAFT"] },
      },
      orderBy: { startDate: "asc" },
      take: 6,
      include: {
        course: { select: { name: true, slug: true } },
        _count: {
          select: {
            registrations: {
              where: { status: { in: ["PENDING", "CONFIRMED", "ATTENDING"] } },
            },
          },
        },
      },
    }),

    // ── All roles: tasks due today or already overdue (ownership-scoped) ──────
    prisma.task.findMany({
      where: {
        dueDate: { lte: todayEnd },
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        ...ownerFilter,
      },
      orderBy: { dueDate: { sort: "asc", nulls: "last" } },
      take: 5,
      select: { id: true, title: true, dueDate: true, status: true },
    }),
  ]);

  // ── Build attention items in priority order ───────────────────────────────
  const attentionItems: AttentionItem[] = [];

  // Sales / Marketing: leads needing follow-up
  if (canViewLeads && followUpCount > 0) {
    attentionItems.push({
      count: followUpCount,
      label:
        followUpCount === 1 ? "lead needs follow-up" : "leads need follow-up",
      href: "/leads?followUp=needs-followup",
    });
  }

  // Finance: new pending payments (confirmation needed)
  // Show the fresh-pending count only when there are no overdue ones, or always.
  // We subtract overduePaymentCount so the two rows don't double-count.
  const freshPendingCount = Math.max(
    0,
    pendingPaymentCount - overduePaymentCount
  );
  if (canViewPayments && freshPendingCount > 0) {
    attentionItems.push({
      count: freshPendingCount,
      label:
        freshPendingCount === 1
          ? "payment needs confirmation"
          : "payments need confirmation",
      href: "/payments?status=PENDING",
    });
  }

  // Finance: payments that have been pending too long — higher urgency
  if (canViewPayments && overduePaymentCount > 0) {
    attentionItems.push({
      count: overduePaymentCount,
      label:
        overduePaymentCount === 1
          ? `payment overdue (>${PAYMENT_OVERDUE_DAYS}d pending)`
          : `payments overdue (>${PAYMENT_OVERDUE_DAYS}d pending)`,
      href: "/payments?status=PENDING",
    });
  }

  // Marketing: landing pages still in draft
  if (canViewLandingPages && draftPageCount > 0) {
    attentionItems.push({
      count: draftPageCount,
      label:
        draftPageCount === 1
          ? "landing page still in draft"
          : "landing pages still in draft",
      href: "/landing-pages?status=DRAFT",
    });
  }

  // Trainer: sessions needing attendance
  if (canViewAttendance && pendingAttendanceCount > 0) {
    attentionItems.push({
      count: pendingAttendanceCount,
      label:
        pendingAttendanceCount === 1
          ? "session needs attendance"
          : "sessions need attendance",
      href: "/attendance",
    });
  }

  // All roles: overdue tasks
  if (overdueTaskCount > 0) {
    attentionItems.push({
      count: overdueTaskCount,
      label: overdueTaskCount === 1 ? "task is overdue" : "tasks are overdue",
      href: "/tasks?preset=overdue",
    });
  }

  return {
    attentionItems,
    todaySessions: todaySessions.map((s) => ({
      id: s.id,
      name: s.title?.trim() || s.course.name,
      courseSlug: s.course.slug,
      startTime: fmtTime(s.startDate),
      endTime: fmtTime(s.endDate),
      studentCount: s._count.registrations,
    })),
    priorityTasks: priorityTasks.map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      isOverdue: t.dueDate ? t.dueDate < todayStart : false,
      status: t.status,
    })),
  };
}
