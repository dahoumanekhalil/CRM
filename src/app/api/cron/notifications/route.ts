import { type NextRequest, NextResponse } from "next/server";
import { addMinutes, addSeconds, subHours, subMinutes, format } from "date-fns";
import { TZDate } from "@date-fns/tz";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { InAppProvider } from "@/lib/notifications/providers/in-app";
import { TelegramProvider } from "@/lib/notifications/providers/telegram";
import { NotificationTypes } from "@/lib/notifications/types";
import type { NotificationIntent, NotificationType } from "@/lib/notifications/types";
import { hasPermission, type Permission } from "@/lib/permissions";
import { getOrgTimezone } from "@/lib/org";

// ── Permission map ─────────────────────────────────────────────────────────────
// Maps each notification type to the permission the recipient must still hold
// at delivery time. Types with no entry are granted to ALL roles — no check needed.

const NOTIF_PERMISSION_MAP: Partial<Record<string, Permission>> = {
  "courseRun.reminder":        "sessions.view",
  "courseRun.today":           "sessions.view",
  "courseRun.nearCapacity":    "sessions.view",
  "courseRun.capacityReached": "sessions.view",
  "courseRun.rescheduled":     "sessions.view",
  "courseRun.locationChanged": "sessions.view",
  "courseRun.cancelled":       "sessions.view",
  "session.reminder":          "sessions.view",
  "session.today":             "sessions.view",
  "session.nearCapacity":      "sessions.view",
  "payment.pending":           "payments.view",
  "payment.recorded":          "payments.view",
  "payment.confirmed":         "payments.view",
  "payment.rejected":          "payments.view",
  "payment.balanceCleared":    "payments.view",
  "balance.outstanding":       "finance.view",
  "expense.thresholdExceeded": "finance.view",
  "lead.assigned":             "leads.view",
  "lead.reassigned":           "leads.view",
  "lead.unassignedAlert":      "sales.view",
  "team.overdueAlert":         "sales.view",
  "registration.confirmed":    "students.view",
  "registration.cancelled":    "students.view",
  "registration.runChanged":   "students.view",
  "attendance.noShow":         "students.view",
  "course.update":             "courses.view",
};

// ── Auth ──────────────────────────────────────────────────────────────────────

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

// ── Enqueue helper ─────────────────────────────────────────────────────────────

async function enqueue(
  type: string,
  recipientId: string,
  payload: Record<string, unknown>,
  opts: {
    entityType?: string;
    entityId?: string;
    provider?: string;
    scheduledAt?: Date;
    dedupWindowHours?: number;
  } = {},
): Promise<boolean> {
  const { entityId, entityType, provider = "all", scheduledAt, dedupWindowHours = 23 } = opts;

  if (entityId) {
    const since = subHours(new Date(), dedupWindowHours);
    const dup = await prisma.scheduledNotification.findFirst({
      where: {
        recipientId,
        type,
        entityId,
        status: { in: ["PENDING", "PROCESSING", "SENT"] },
        createdAt: { gte: since },
      },
      select: { id: true },
    });
    if (dup) return false;
  }

  const burstCount = await prisma.scheduledNotification.count({
    where: { recipientId, createdAt: { gte: subMinutes(new Date(), 5) } },
  });
  if (burstCount >= 20) {
    console.warn(`[enqueue] burst protection triggered for recipient ${recipientId}`);
    return false;
  }

  await prisma.scheduledNotification.create({
    data: {
      type,
      recipientId,
      payload: payload as Prisma.InputJsonValue,
      scheduledAt: scheduledAt ?? new Date(),
      entityType: entityType ?? null,
      entityId: entityId ?? null,
      provider,
    },
  });
  return true;
}

// ── Discoverers ───────────────────────────────────────────────────────────────

async function discoverTaskReminders(): Promise<number> {
  const now = new Date();
  const tasks = await prisma.task.findMany({
    where: {
      dueDate: { gte: addMinutes(now, 25), lte: addMinutes(now, 35) },
      status: { notIn: ["COMPLETED", "CANCELLED"] },
      ownerId: { not: null },
    },
    select: { id: true, title: true, ownerId: true },
  });

  let enqueued = 0;
  for (const task of tasks) {
    if (!task.ownerId) continue;
    const ok = await enqueue(
      NotificationTypes.TASK_REMINDER,
      task.ownerId,
      { title: "Task due in 30 minutes", body: task.title, taskTitle: task.title },
      { entityType: "Task", entityId: task.id, dedupWindowHours: 1 },
    );
    if (ok) enqueued++;
  }
  return enqueued;
}

async function discoverOverdueTasks(): Promise<number> {
  const timezone = await getOrgTimezone();
  const today = format(new TZDate(new Date(), timezone), "yyyy-MM-dd");
  const syntheticId = `overdue:${today}`;

  const groups = await prisma.task.groupBy({
    by: ["ownerId"],
    where: {
      dueDate: { lt: new Date() },
      status: { notIn: ["COMPLETED", "CANCELLED"] },
      ownerId: { not: null },
    },
    _count: { _all: true },
  });

  let enqueued = 0;
  for (const g of groups) {
    if (!g.ownerId) continue;
    const count = g._count._all;
    const ok = await enqueue(
      NotificationTypes.TASK_OVERDUE,
      g.ownerId,
      {
        title: "Overdue tasks",
        body: `You have ${count} overdue task${count !== 1 ? "s" : ""}.`,
        count,
      },
      { entityType: "Task", entityId: syntheticId },
    );
    if (ok) enqueued++;
  }
  return enqueued;
}

async function discoverCourseRunReminders(): Promise<number> {
  const now = new Date();
  const sessions = await prisma.courseSession.findMany({
    where: {
      startDate: { gte: addMinutes(now, 55), lte: addMinutes(now, 65) },
      status: { in: ["UPCOMING", "OPEN", "FULL"] },
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      location: true,
      course: { select: { name: true, slug: true } },
      instructor: { select: { userId: true } },
      _count: { select: { registrations: true } },
    },
  });

  let enqueued = 0;
  for (const s of sessions) {
    const recipientId = s.instructor?.userId;
    if (!recipientId) continue;

    const dateRange = `${format(s.startDate, "MMM d")} – ${format(s.endDate, "MMM d, yyyy")}`;
    const ok = await enqueue(
      NotificationTypes.COURSE_RUN_REMINDER,
      recipientId,
      {
        title: "Course Run starts in 1 hour",
        body: s.course.name,
        courseName: s.course.name,
        courseSlug: s.course.slug,
        dateRange,
        location: s.location ?? "",
        registrationCount: s._count.registrations,
      },
      { entityType: "Session", entityId: s.id, dedupWindowHours: 2 },
    );
    if (ok) enqueued++;
  }
  return enqueued;
}

async function discoverCourseRunToday(): Promise<number> {
  const timezone = await getOrgTimezone();
  const nowInTz = new TZDate(new Date(), timezone);
  const today = format(nowInTz, "yyyy-MM-dd");
  const syntheticId = `courseRun.today:${today}`;

  const dayStart = new TZDate(nowInTz.getFullYear(), nowInTz.getMonth(), nowInTz.getDate(), 0, 0, 0, 0, timezone);
  const dayEnd   = new TZDate(nowInTz.getFullYear(), nowInTz.getMonth(), nowInTz.getDate(), 23, 59, 59, 999, timezone);

  const sessions = await prisma.courseSession.findMany({
    where: {
      startDate: { gte: dayStart, lte: dayEnd },
      status: { in: ["UPCOMING", "OPEN", "FULL", "IN_PROGRESS"] },
      instructor: { userId: { not: null } },
    },
    select: {
      id: true,
      startDate: true,
      location: true,
      course: { select: { name: true, slug: true } },
      instructor: { select: { userId: true } },
      _count: {
        select: {
          registrations: {
            where: { status: { in: ["CONFIRMED", "ATTENDING"] } },
          },
        },
      },
    },
  });

  const byInstructor = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const uid = s.instructor?.userId;
    if (!uid) continue;
    if (!byInstructor.has(uid)) byInstructor.set(uid, []);
    byInstructor.get(uid)!.push(s);
  }

  let enqueued = 0;
  for (const [recipientId, trainerSessions] of byInstructor) {
    const count = trainerSessions.length;
    const ok = await enqueue(
      NotificationTypes.COURSE_RUN_TODAY,
      recipientId,
      {
        title: `You have ${count} Course Run${count !== 1 ? "s" : ""} today`,
        body: trainerSessions[0]?.course.name ?? "",
        count,
        sessions: trainerSessions.map((s) => ({
          courseName: s.course.name,
          location: s.location ?? "",
          registered: s._count.registrations,
        })),
      },
      { entityType: "System", entityId: syntheticId },
    );
    if (ok) enqueued++;
  }
  return enqueued;
}

async function discoverPaymentAlerts(): Promise<number> {
  const cutoff = subHours(new Date(), 24);
  const payments = await prisma.payment.findMany({
    where: { status: "PENDING", createdAt: { lt: cutoff } },
    select: {
      id: true,
      amount: true,
      currency: true,
      method: true,
      student: {
        select: {
          firstName: true,
          lastName: true,
          leads: { select: { ownerId: true }, orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });

  let fallbackAdmins: { id: string }[] | null = null;
  let enqueued = 0;

  for (const p of payments) {
    const studentName = [p.student.firstName, p.student.lastName].filter(Boolean).join(" ");
    const payload = {
      title: "Payment awaiting confirmation",
      body: `${studentName} — ${Number(p.amount).toLocaleString()} ${p.currency}`,
      studentName,
      amount: Number(p.amount).toLocaleString(),
      currency: p.currency,
      method: p.method,
    };
    const opts = { entityType: "Payment", entityId: p.id };
    const ownerId = p.student.leads[0]?.ownerId ?? null;

    if (ownerId) {
      if (await enqueue(NotificationTypes.PAYMENT_PENDING, ownerId, payload, opts)) enqueued++;
    } else {
      if (!fallbackAdmins) {
        fallbackAdmins = await prisma.user.findMany({
          where: { role: { in: ["ADMIN", "MANAGER"] } },
          select: { id: true },
        });
      }
      for (const admin of fallbackAdmins) {
        if (await enqueue(NotificationTypes.PAYMENT_PENDING, admin.id, payload, opts)) enqueued++;
      }
    }
  }
  return enqueued;
}

async function discoverDailyDigest(): Promise<number> {
  const timezone = await getOrgTimezone();
  const nowInTz = new TZDate(new Date(), timezone);
  const today = format(nowInTz, "yyyy-MM-dd");
  const syntheticId = `digest:${today}`;
  const dayStart = new TZDate(nowInTz.getFullYear(), nowInTz.getMonth(), nowInTz.getDate(), 0, 0, 0, 0, timezone);
  const dayEnd   = new TZDate(nowInTz.getFullYear(), nowInTz.getMonth(), nowInTz.getDate(), 23, 59, 59, 999, timezone);

  const [newLeads, unassignedLeads, registrations, revenueAgg, pendingPayments, pendingAgg, upcomingSessions, overdueTasks, expenses] =
    await Promise.all([
      prisma.lead.count({ where: { createdAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.lead.count({ where: { ownerId: null, status: { notIn: ["LOST", "REGISTERED"] } } }),
      prisma.registration.count({
        where: { registeredAt: { gte: dayStart, lte: dayEnd }, status: "CONFIRMED" },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: "COMPLETED", paidAt: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.payment.count({ where: { status: "PENDING" } }),
      prisma.payment.groupBy({
        by: ["currency"],
        where: { status: "PENDING" },
        _sum: { amount: true },
      }),
      prisma.courseSession.count({
        where: { startDate: { gte: new Date() }, status: { in: ["UPCOMING", "OPEN"] } },
      }),
      prisma.task.count({
        where: { dueDate: { lt: new Date() }, status: { notIn: ["COMPLETED", "CANCELLED"] } },
      }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: { expenseDate: { gte: dayStart, lte: dayEnd } },
      }),
    ]);

  const amountSum = revenueAgg._sum?.amount;
  const outstandingTotal = pendingAgg.reduce((sum, r) => sum + Number(r._sum?.amount ?? 0), 0);
  const outstandingCurrency = pendingAgg[0]?.currency ?? "DZD";
  const expenseTotal = expenses._sum?.amount;
  const dateLabel = format(nowInTz, "MMM d");

  // Admin/Manager digest
  const adminPayload = {
    title: `Daily digest — ${dateLabel}`,
    body: "",
    date: dateLabel,
    recipientRole: "ADMIN",
    stats: {
      newLeads,
      unassignedLeads,
      registrations,
      revenue: amountSum ? `${Number(amountSum).toLocaleString()} DZD` : "0 DZD",
      outstandingAmount: `${outstandingTotal.toLocaleString()} ${outstandingCurrency}`,
      pendingPayments,
      upcomingSessions,
      overdueTasks,
      paymentsReceived: amountSum ? `${Number(amountSum).toLocaleString()} DZD` : "0 DZD",
      pendingConfirmation: pendingPayments,
      totalOutstanding: `${outstandingTotal.toLocaleString()} ${outstandingCurrency}`,
      expenses: expenseTotal ? `${Number(expenseTotal).toLocaleString()} DZD` : "0 DZD",
    },
  };

  const admins = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "MANAGER"] } },
    select: { id: true },
  });

  let enqueued = 0;
  for (const u of admins) {
    if (
      await enqueue(NotificationTypes.DAILY_DIGEST, u.id, adminPayload, {
        entityType: "System",
        entityId: `${syntheticId}:admin`,
      })
    )
      enqueued++;
  }

  // Finance digest
  const financeUsers = await prisma.user.findMany({
    where: { role: "FINANCE" },
    select: { id: true },
  });
  for (const u of financeUsers) {
    if (
      await enqueue(
        NotificationTypes.DAILY_DIGEST,
        u.id,
        {
          ...adminPayload,
          recipientRole: "FINANCE",
        },
        { entityType: "System", entityId: `${syntheticId}:finance:${u.id}` },
      )
    )
      enqueued++;
  }

  return enqueued;
}

async function discoverUnassignedLeadsAlert(): Promise<number> {
  const timezone = await getOrgTimezone();
  const today = format(new TZDate(new Date(), timezone), "yyyy-MM-dd");
  const syntheticId = `lead.unassigned:${today}`;

  const count = await prisma.lead.count({
    where: { ownerId: null, status: { notIn: ["LOST", "REGISTERED"] } },
  });
  if (count === 0) return 0;

  const managers = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "MANAGER"] } },
    select: { id: true },
  });

  let enqueued = 0;
  for (const u of managers) {
    const ok = await enqueue(
      NotificationTypes.LEAD_UNASSIGNED_ALERT,
      u.id,
      {
        title: "Unassigned leads waiting",
        body: `${count} lead${count !== 1 ? "s" : ""} have no assigned Sales Rep.`,
        count,
      },
      { entityType: "System", entityId: syntheticId },
    );
    if (ok) enqueued++;
  }
  return enqueued;
}

async function discoverTeamOverdueAlert(): Promise<number> {
  const timezone = await getOrgTimezone();
  const today = format(new TZDate(new Date(), timezone), "yyyy-MM-dd");
  const syntheticId = `team.overdue:${today}`;
  const THRESHOLD = 5;

  const allGroups = await prisma.lead.groupBy({
    by: ["ownerId"],
    where: {
      ownerId: { not: null },
      nextActionDue: { lt: new Date() },
      status: { notIn: ["LOST", "REGISTERED"] },
    },
    _count: { _all: true },
  });
  const groups = allGroups.filter((g) => g._count._all >= THRESHOLD);
  if (groups.length === 0) return 0;

  const repIds = groups.map((g) => g.ownerId!);
  const reps = await prisma.user.findMany({
    where: { id: { in: repIds } },
    select: { id: true, name: true },
  });
  const repNames = new Map(reps.map((r) => [r.id, r.name ?? r.id]));

  const managers = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "MANAGER"] } },
    select: { id: true },
  });

  let enqueued = 0;
  for (const u of managers) {
    const ok = await enqueue(
      NotificationTypes.TEAM_OVERDUE_ALERT,
      u.id,
      {
        title: "Team overdue leads alert",
        body: groups.map((g) => `${repNames.get(g.ownerId!) ?? "Rep"}: ${g._count._all} overdue`).join(", "),
        reps: groups.map((g) => ({ name: repNames.get(g.ownerId!), count: g._count._all })),
      },
      { entityType: "System", entityId: syntheticId },
    );
    if (ok) enqueued++;
  }
  return enqueued;
}

async function discoverOutstandingBalance(): Promise<number> {
  const timezone = await getOrgTimezone();
  const today = format(new TZDate(new Date(), timezone), "yyyy-MM-dd");
  const syntheticId = `balance.outstanding:${today}`;

  const [pendingCount, pendingAgg] = await Promise.all([
    prisma.registration.count({
      where: { status: { in: ["PENDING", "CONFIRMED", "ATTENDING"] } },
    }),
    prisma.payment.groupBy({
      by: ["currency"],
      where: { status: "PENDING" },
      _sum: { amount: true },
    }),
  ]);
  if (pendingCount === 0) return 0;

  const byCurrency = pendingAgg.map((r) => ({
    currency: r.currency,
    total: Number(r._sum.amount ?? 0),
  }));

  const financeUsers = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "MANAGER", "FINANCE"] } },
    select: { id: true },
  });

  let enqueued = 0;
  for (const u of financeUsers) {
    const ok = await enqueue(
      NotificationTypes.BALANCE_OUTSTANDING,
      u.id,
      {
        title: "Outstanding balance summary",
        body: `${pendingCount} registration${pendingCount !== 1 ? "s" : ""} have remaining balances.`,
        recipientRole: "ADMIN",
        pendingCount,
        byCurrency,
      },
      { entityType: "System", entityId: syntheticId },
    );
    if (ok) enqueued++;
  }
  return enqueued;
}

// ── Stale processing recovery ──────────────────────────────────────────────────

async function recoverStaleProcessing(): Promise<number> {
  const staleAt = subMinutes(new Date(), 5);
  const result = await prisma.scheduledNotification.updateMany({
    where: { status: "PROCESSING", lastAttemptAt: { lt: staleAt } },
    data: { status: "PENDING" },
  });
  return result.count;
}

// ── Queue processor ────────────────────────────────────────────────────────────

const BACKOFF_SECONDS = [30, 300, 1800];

async function processOne(
  n: Awaited<ReturnType<typeof prisma.scheduledNotification.findMany>>[number],
): Promise<"sent" | "failed" | "retrying" | "cancelled"> {
  const claimed = await prisma.scheduledNotification.updateMany({
    where: { id: n.id, status: "PENDING" },
    data: { status: "PROCESSING", lastAttemptAt: new Date(), attemptCount: { increment: 1 } },
  });
  if (claimed.count === 0) return "cancelled";

  const currentAttempt = n.attemptCount + 1;

  try {
    const user = await prisma.user.findUnique({ where: { id: n.recipientId }, select: { id: true, role: true } });
    if (!user) throw new Error("Recipient no longer exists");

    const requiredPermission = NOTIF_PERMISSION_MAP[n.type];
    if (requiredPermission && !hasPermission(user.role, requiredPermission)) {
      await prisma.scheduledNotification.update({
        where: { id: n.id },
        data: {
          status: "CANCELLED",
          failureReason: `Recipient role ${user.role} no longer has permission ${requiredPermission}`,
        },
      });
      return "cancelled";
    }

    const intent: NotificationIntent = {
      recipientId: n.recipientId,
      type: n.type as NotificationType,
      payload: n.payload as Record<string, unknown>,
      entityType: n.entityType ?? undefined,
      entityId: n.entityId ?? undefined,
    };

    if (n.provider === "telegram") {
      await TelegramProvider.send(intent);
    } else if (n.provider === "inapp") {
      await InAppProvider.send(intent);
    } else {
      await Promise.all([InAppProvider.send(intent), TelegramProvider.send(intent)]);
    }

    await prisma.scheduledNotification.update({
      where: { id: n.id },
      data: { status: "SENT", sentAt: new Date() },
    });
    return "sent";
  } catch (err) {
    const failureReason = err instanceof Error ? err.message : String(err);

    if (currentAttempt >= 3) {
      await prisma.scheduledNotification.update({
        where: { id: n.id },
        data: { status: "FAILED", failureReason },
      });
      return "failed";
    }

    const backoffSecs = BACKOFF_SECONDS[currentAttempt - 1] ?? 1800;
    await prisma.scheduledNotification.update({
      where: { id: n.id },
      data: {
        status: "PENDING",
        scheduledAt: addSeconds(new Date(), backoffSecs),
        failureReason,
      },
    });
    return "retrying";
  }
}

async function processQueue(): Promise<{ sent: number; failed: number; retrying: number; cancelled: number }> {
  const pending = await prisma.scheduledNotification.findMany({
    where: { status: "PENDING", scheduledAt: { lte: new Date() } },
    orderBy: { scheduledAt: "asc" },
    take: 50,
  });

  const outcomes = await Promise.allSettled(pending.map(processOne));

  let sent = 0, failed = 0, retrying = 0, cancelled = 0;
  for (const o of outcomes) {
    if (o.status === "fulfilled") {
      if (o.value === "sent") sent++;
      else if (o.value === "failed") failed++;
      else if (o.value === "cancelled") cancelled++;
      else retrying++;
    } else {
      console.error("[cron] processOne threw:", o.reason);
      failed++;
    }
  }
  return { sent, failed, retrying, cancelled };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const recovered = await recoverStaleProcessing();

    const [
      taskReminders,
      overdueTasks,
      courseRunReminders,
      courseRunToday,
      paymentAlerts,
      dailyDigest,
      unassignedLeads,
      teamOverdue,
      outstandingBalance,
    ] = await Promise.all([
      discoverTaskReminders(),
      discoverOverdueTasks(),
      discoverCourseRunReminders(),
      discoverCourseRunToday(),
      discoverPaymentAlerts(),
      discoverDailyDigest(),
      discoverUnassignedLeadsAlert(),
      discoverTeamOverdueAlert(),
      discoverOutstandingBalance(),
    ]);

    const queue = await processQueue();

    return NextResponse.json({
      ok: true,
      recovered,
      enqueued: {
        taskReminders,
        overdueTasks,
        courseRunReminders,
        courseRunToday,
        paymentAlerts,
        dailyDigest,
        unassignedLeads,
        teamOverdue,
        outstandingBalance,
      },
      queue,
    });
  } catch (err) {
    console.error("[cron/notifications] fatal error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
