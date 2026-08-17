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

// ── TASK 16.2 — Permission-aware delivery ─────────────────────────────────────
// Maps each notification type to the permission the recipient must still hold
// at delivery time. If their role changed after scheduling, skip silently.
// Types with no entry (task.*, daily.digest) are granted to ALL_ROLES — no check needed.

const NOTIF_PERMISSION_MAP: Partial<Record<string, Permission>> = {
  "session.reminder":     "sessions.view",
  "session.nearCapacity": "sessions.view",
  "payment.pending":      "payments.view",
  "lead.assigned":        "leads.view",
  "lead.followup":        "leads.view",
  "course.update":        "courses.view",
};

// ── Auth ──────────────────────────────────────────────────────────────────────

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

// ── Enqueue helper ────────────────────────────────────────────────────────────
// Writes one ScheduledNotification record (skips if already queued/sent).

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

  // Skip if we already have a PENDING/PROCESSING/SENT record within the dedup window.
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

  // Burst protection: skip if this recipient already has 20+ notifications enqueued in the last 5 min.
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

// ── C5 Discovery: produce ScheduledNotification rows ─────────────────────────
// These replace the direct-fire calls in the old C5 implementation.

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

async function discoverSessionReminders(): Promise<number> {
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
      NotificationTypes.SESSION_REMINDER,
      recipientId,
      {
        title: "Session starts in 1 hour",
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

async function discoverPaymentAlerts(): Promise<number> {
  const cutoff = subHours(new Date(), 24);
  const payments = await prisma.payment.findMany({
    where: { status: "PENDING", createdAt: { lt: cutoff } },
    select: {
      id: true,
      amount: true,
      currency: true,
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
      title: "Payment pending",
      body: `${studentName} — ${p.amount} ${p.currency}`,
      studentName,
      amount: String(p.amount),
      currency: p.currency,
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
  // Compute day boundaries in the org timezone by constructing TZDate objects.
  const dayStart = new TZDate(
    nowInTz.getFullYear(),
    nowInTz.getMonth(),
    nowInTz.getDate(),
    0, 0, 0, 0,
    timezone,
  );
  const dayEnd = new TZDate(
    nowInTz.getFullYear(),
    nowInTz.getMonth(),
    nowInTz.getDate(),
    23, 59, 59, 999,
    timezone,
  );

  const [newLeads, registrations, revenueAgg, pendingPayments, upcomingSessions, overdueTasks] =
    await Promise.all([
      prisma.lead.count({ where: { createdAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.registration.count({ where: { registeredAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: "COMPLETED", paidAt: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.payment.count({ where: { status: "PENDING" } }),
      prisma.courseSession.count({
        where: { startDate: { gte: new Date() }, status: { in: ["UPCOMING", "OPEN"] } },
      }),
      prisma.task.count({
        where: { dueDate: { lt: new Date() }, status: { notIn: ["COMPLETED", "CANCELLED"] } },
      }),
    ]);

  const amountSum = revenueAgg._sum?.amount;
  const dateLabel = format(nowInTz, "MMM d");
  const payload = {
    title: `Daily digest — ${dateLabel}`,
    body: "",
    date: dateLabel,
    stats: {
      newLeads,
      registrations,
      revenue: amountSum ? `${amountSum.toFixed(2)} USD` : "0.00 USD",
      pendingPayments,
      upcomingSessions,
      overdueTasks,
    },
  };

  const recipients = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "MANAGER"] } },
    select: { id: true },
  });

  let enqueued = 0;
  for (const u of recipients) {
    if (
      await enqueue(NotificationTypes.DAILY_DIGEST, u.id, payload, {
        entityType: "System",
        entityId: syntheticId,
      })
    )
      enqueued++;
  }
  return enqueued;
}

// ── Stale processing recovery ─────────────────────────────────────────────────
// If the cron crashed mid-batch, records may be stuck in PROCESSING.
// Reset them to PENDING so they are retried next run.

async function recoverStaleProcessing(): Promise<number> {
  const staleAt = subMinutes(new Date(), 5);
  const result = await prisma.scheduledNotification.updateMany({
    where: { status: "PROCESSING", lastAttemptAt: { lt: staleAt } },
    data: { status: "PENDING" },
  });
  return result.count;
}

// ── Queue processor ───────────────────────────────────────────────────────────

// Backoff delays per attempt number (1-indexed): 30s, 5min, 30min.
const BACKOFF_SECONDS = [30, 300, 1800];

async function processOne(
  n: Awaited<ReturnType<typeof prisma.scheduledNotification.findMany>>[number],
): Promise<"sent" | "failed" | "retrying" | "cancelled"> {
  // Atomically claim this record. updateMany with a status condition ensures
  // only one concurrent cron instance wins the race — PostgreSQL guarantees
  // that only one transaction will find status = PENDING and update it.
  const claimed = await prisma.scheduledNotification.updateMany({
    where: { id: n.id, status: "PENDING" },
    data: { status: "PROCESSING", lastAttemptAt: new Date(), attemptCount: { increment: 1 } },
  });
  if (claimed.count === 0) return "cancelled"; // Already claimed by another instance.

  const currentAttempt = n.attemptCount + 1;

  try {
    // Validate recipient still exists and fetch role for permission check (TASK 16.2).
    const user = await prisma.user.findUnique({ where: { id: n.recipientId }, select: { id: true, role: true } });
    if (!user) throw new Error("Recipient no longer exists");

    // TASK 16.2 — If the recipient's role no longer grants the required permission
    // for this notification type (e.g. demoted after scheduling), cancel silently.
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

    // Dispatch to the appropriate provider(s).
    if (n.provider === "telegram") {
      await TelegramProvider.send(intent);
    } else if (n.provider === "inapp") {
      await InAppProvider.send(intent);
    } else {
      // "all" — deliver to both; treat as failure if either throws.
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
      // processOne itself threw unexpectedly — not a provider error.
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
    // 1. Recover records stuck in PROCESSING from a previous crashed run.
    const recovered = await recoverStaleProcessing();

    // 2. Discover and enqueue new notifications (C5 handlers).
    const [taskReminders, overdueTasks, sessionReminders, paymentAlerts, dailyDigest] =
      await Promise.all([
        discoverTaskReminders(),
        discoverOverdueTasks(),
        discoverSessionReminders(),
        discoverPaymentAlerts(),
        discoverDailyDigest(),
      ]);

    // 3. Process the queue (up to 50 due items).
    const queue = await processQueue();

    return NextResponse.json({
      ok: true,
      recovered,
      enqueued: { taskReminders, overdueTasks, sessionReminders, paymentAlerts, dailyDigest },
      queue,
    });
  } catch (err) {
    console.error("[cron/notifications] fatal error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
