import "server-only";
import { prisma } from "@/lib/prisma";
import { sendMessage } from "@/lib/telegram/client";
import {
  escHtml,
  msgTaskAssigned,
  msgC5aTaskReminder,
  msgC5bOverdueTasks,
  msgCourseRunReminder,
  msgCourseRunToday,
  msgCourseRunNearCapacity,
  msgCourseRunCapacityReached,
  msgCourseRunRescheduled,
  msgCourseRunLocationChanged,
  msgCourseRunCancelled,
  msgC5dPaymentPending,
  msgPaymentRecorded,
  msgPaymentConfirmed,
  msgPaymentRejected,
  msgPaymentBalanceCleared,
  msgC5eLeadAssigned,
  msgC5eLeadAssignedBulk,
  msgLeadReassigned,
  msgLeadUnassignedAlert,
  msgTeamOverdueAlert,
  msgRegistrationConfirmed,
  msgRegistrationCancelled,
  msgRegistrationRunChanged,
  msgBalanceOutstandingManager,
  msgBalanceOutstandingSales,
  msgExpenseThresholdExceeded,
  msgAttendanceNoShow,
  msgC5fDailyDigest,
  msgDailyDigestSales,
  msgDailyDigestTrainer,
  msgDailyDigestFinance,
  msgLiveSessionReminder,
  msgLiveSessionStarted,
  msgLiveSessionStudentJoin,
  msgLiveSessionStudentReminder,
  msgLiveSessionStudentRecordingReady,
  msgLiveSessionRecordingReady,
  type DailyDigestStats,
  type Lang,
} from "@/lib/telegram/message-templates";
import { isPreferenceEnabled } from "../preferences";
import type { NotificationProvider, NotificationIntent } from "../types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

function deepLink(path: string): string {
  return APP_URL ? `${APP_URL}${path}` : "";
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function num(v: unknown): number {
  return typeof v === "number" ? v : 0;
}
function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function formatMessage(intent: NotificationIntent, lang: Lang): string | null {
  const { type, payload } = intent;

  switch (type) {
    // ── Tasks ───────────────────────────────────────────────────────────────
    case "task.assigned": {
      if (!payload.taskTitle) return null;
      return msgTaskAssigned(
        str(payload.taskTitle),
        typeof payload.due === "string" ? payload.due : undefined,
        deepLink("/tasks"),
        lang,
      );
    }

    case "task.reminder": {
      if (!payload.taskTitle) return null;
      return msgC5aTaskReminder(str(payload.taskTitle), deepLink("/tasks"), lang);
    }

    case "task.overdue": {
      return msgC5bOverdueTasks(num(payload.count) || 1, deepLink("/tasks"), lang);
    }

    // ── Course Runs ─────────────────────────────────────────────────────────
    case "courseRun.reminder":
    case "session.reminder": {
      if (!payload.courseName) return null;
      return msgCourseRunReminder(
        str(payload.courseName),
        str(payload.dateRange),
        str(payload.location),
        num(payload.registrationCount),
        deepLink(`/courses/${str(payload.courseSlug)}`),
        lang,
      );
    }

    case "courseRun.today":
    case "session.today": {
      const sessions = arr<{ courseName: string; location: string; registered: number }>(payload.sessions);
      const count = num(payload.count) || sessions.length || 1;
      return msgCourseRunToday(count, sessions, deepLink("/sessions"), lang);
    }

    case "courseRun.nearCapacity":
    case "session.nearCapacity": {
      if (!payload.courseName) return null;
      const filled = num(payload.filled);
      const capacity = num(payload.capacity);
      const pct = capacity > 0 ? Math.round((filled / capacity) * 100) : 0;
      return msgCourseRunNearCapacity(
        str(payload.courseName),
        filled,
        capacity,
        pct,
        deepLink(`/courses/${str(payload.courseSlug)}`),
        lang,
      );
    }

    case "courseRun.capacityReached": {
      if (!payload.courseName) return null;
      return msgCourseRunCapacityReached(
        str(payload.courseName),
        num(payload.capacity),
        deepLink(`/courses/${str(payload.courseSlug)}`),
        lang,
      );
    }

    case "courseRun.rescheduled": {
      if (!payload.courseName) return null;
      return msgCourseRunRescheduled(
        str(payload.courseName),
        str(payload.oldDate),
        str(payload.newDate),
        num(payload.affectedCount),
        deepLink(`/courses/${str(payload.courseSlug)}`),
        lang,
      );
    }

    case "courseRun.locationChanged": {
      if (!payload.courseName) return null;
      return msgCourseRunLocationChanged(
        str(payload.courseName),
        str(payload.date),
        str(payload.oldLocation),
        str(payload.newLocation),
        deepLink(`/courses/${str(payload.courseSlug)}`),
        lang,
      );
    }

    case "courseRun.cancelled": {
      if (!payload.courseName) return null;
      return msgCourseRunCancelled(
        str(payload.courseName),
        str(payload.date),
        num(payload.affectedCount),
        deepLink(`/courses/${str(payload.courseSlug)}`),
        lang,
      );
    }

    // ── Payments ────────────────────────────────────────────────────────────
    case "payment.pending": {
      if (!payload.studentName) return null;
      return msgC5dPaymentPending(
        str(payload.studentName),
        str(payload.amount),
        str(payload.currency),
        str(payload.method) || "—",
        deepLink("/payments"),
        lang,
      );
    }

    case "payment.recorded": {
      if (!payload.studentName) return null;
      return msgPaymentRecorded(
        str(payload.studentName),
        str(payload.amount),
        str(payload.currency),
        str(payload.courseName) || "—",
        str(payload.sessionDate) || "—",
        str(payload.salesRepName) || "—",
        str(payload.method) || "—",
        deepLink(`/payments`),
        lang,
      );
    }

    case "payment.confirmed": {
      if (!payload.studentName) return null;
      return msgPaymentConfirmed(
        str(payload.studentName),
        str(payload.amount),
        str(payload.currency),
        str(payload.method) || "—",
        deepLink("/payments"),
        lang,
      );
    }

    case "payment.rejected": {
      if (!payload.studentName) return null;
      return msgPaymentRejected(
        str(payload.studentName),
        str(payload.amount),
        str(payload.currency),
        str(payload.reason) || "—",
        deepLink("/payments"),
        lang,
      );
    }

    case "payment.balanceCleared": {
      if (!payload.studentName) return null;
      return msgPaymentBalanceCleared(
        str(payload.studentName),
        str(payload.courseName) || "—",
        str(payload.totalPaid),
        str(payload.currency),
        deepLink(`/students/${str(payload.studentId)}`),
        lang,
      );
    }

    // ── Leads ───────────────────────────────────────────────────────────────
    case "lead.assigned": {
      const leadCount = num(payload.leadCount);
      if (leadCount > 1) {
        return msgC5eLeadAssignedBulk(leadCount, deepLink("/leads?ownership=mine"), lang);
      }
      if (!payload.leadName) return null;
      return msgC5eLeadAssigned(
        str(payload.leadName),
        typeof payload.courseName === "string" ? payload.courseName : null,
        deepLink(`/leads/${str(payload.leadId)}`),
        lang,
      );
    }

    case "lead.reassigned": {
      if (!payload.leadName) return null;
      return msgLeadReassigned(
        str(payload.leadName),
        str(payload.fromRepName) || "another rep",
        typeof payload.courseName === "string" ? payload.courseName : null,
        deepLink(`/leads/${str(payload.leadId)}`),
        lang,
      );
    }

    case "lead.unassignedAlert": {
      return msgLeadUnassignedAlert(
        num(payload.count) || 1,
        deepLink("/leads?ownership=unassigned"),
        lang,
      );
    }

    case "team.overdueAlert": {
      const reps = arr<{ name: string; count: number }>(payload.reps);
      return msgTeamOverdueAlert(reps, deepLink("/leads"), lang);
    }

    // ── Registrations ───────────────────────────────────────────────────────
    case "registration.confirmed": {
      if (!payload.studentName) return null;
      return msgRegistrationConfirmed(
        str(payload.studentName),
        str(payload.courseName),
        str(payload.sessionDate),
        str(payload.salesRepName),
        str(payload.paymentStatus),
        deepLink(`/students/${str(payload.studentId)}`),
        lang,
      );
    }

    case "registration.cancelled": {
      if (!payload.studentName) return null;
      return msgRegistrationCancelled(
        str(payload.studentName),
        str(payload.courseName),
        str(payload.sessionDate),
        str(payload.amountPaid) || "0",
        str(payload.currency) || "DZD",
        deepLink(`/students/${str(payload.studentId)}`),
        lang,
      );
    }

    case "registration.runChanged": {
      if (!payload.studentName) return null;
      return msgRegistrationRunChanged(
        str(payload.studentName),
        str(payload.courseName),
        str(payload.oldDate),
        str(payload.newDate),
        deepLink(`/students/${str(payload.studentId)}`),
        lang,
      );
    }

    // ── Finance ─────────────────────────────────────────────────────────────
    case "balance.outstanding": {
      const role = str(payload.recipientRole);
      if (role === "SALES") {
        if (!payload.studentName) return null;
        return msgBalanceOutstandingSales(
          str(payload.studentName),
          str(payload.remaining),
          str(payload.currency) || "DZD",
          deepLink(`/students/${str(payload.studentId)}`),
          lang,
        );
      }
      return msgBalanceOutstandingManager(
        num(payload.pendingCount),
        arr<{ currency: string; total: number }>(payload.byCurrency),
        deepLink("/payments"),
        lang,
      );
    }

    case "expense.thresholdExceeded": {
      if (!payload.title) return null;
      return msgExpenseThresholdExceeded(
        str(payload.title),
        str(payload.category),
        str(payload.amount),
        str(payload.currency),
        deepLink("/payments"),
        lang,
      );
    }

    // ── Attendance ──────────────────────────────────────────────────────────
    case "attendance.noShow": {
      if (!payload.studentName) return null;
      return msgAttendanceNoShow(
        str(payload.studentName),
        str(payload.courseName),
        str(payload.sessionDate),
        deepLink(`/courses/${str(payload.courseSlug)}`),
        lang,
      );
    }

    // ── Daily Digest (role-aware) ────────────────────────────────────────────
    case "daily.digest": {
      if (!payload.date || !payload.stats) return null;
      const stats = payload.stats as DailyDigestStats;
      const role = str(payload.recipientRole);
      if (role === "TRAINER") {
        return msgDailyDigestTrainer(str(payload.date), stats, deepLink("/sessions"), lang);
      }
      if (role === "FINANCE") {
        return msgDailyDigestFinance(str(payload.date), stats, deepLink("/payments"), lang);
      }
      if (role === "SALES") {
        return msgDailyDigestSales(str(payload.date), stats, deepLink("/leads?ownership=mine"), lang);
      }
      return msgC5fDailyDigest(str(payload.date), stats, lang, deepLink("/"));
    }

    // ── Live Classroom ───────────────────────────────────────────────────────
    case "liveSession.reminder": {
      if (!payload.courseName) return null;
      return msgLiveSessionReminder(
        str(payload.courseName),
        num(payload.minutesBefore) || 30,
        deepLink(`/courses/${str(payload.courseSlug)}/sessions/${str(payload.courseSessionId)}`),
        lang,
      );
    }

    case "liveSession.started": {
      if (!payload.courseName) return null;
      return msgLiveSessionStarted(
        str(payload.courseName),
        deepLink(`/courses/${str(payload.courseSlug)}/sessions/${str(payload.courseSessionId)}`),
        lang,
      );
    }

    case "liveSession.studentJoin": {
      if (!payload.courseName) return null;
      return msgLiveSessionStudentJoin(
        str(payload.courseName),
        deepLink(`/courses/${str(payload.courseSlug)}/sessions/${str(payload.courseSessionId)}`),
        lang,
      );
    }

    case "liveSession.recordingReady": {
      if (!payload.courseName) return null;
      return msgLiveSessionRecordingReady(
        str(payload.courseName),
        deepLink(`/courses/${str(payload.courseSlug)}/sessions/${str(payload.courseSessionId)}`),
        lang,
      );
    }

    case "liveSession.studentReminder": {
      if (!payload.courseName) return null;
      return msgLiveSessionStudentReminder(
        str(payload.courseName),
        deepLink(`/courses/${str(payload.courseSlug)}/sessions/${str(payload.courseSessionId)}`),
        typeof payload.minutesBefore === "number" ? payload.minutesBefore : 30,
        lang,
      );
    }

    case "liveSession.studentRecordingReady": {
      if (!payload.courseName) return null;
      return msgLiveSessionStudentRecordingReady(
        str(payload.courseName),
        deepLink(`/courses/${str(payload.courseSlug)}/sessions/${str(payload.courseSessionId)}`),
        lang,
      );
    }

    // ── Deprecated fallback ─────────────────────────────────────────────────
    case "course.update":
    default: {
      const title = typeof payload.title === "string" ? payload.title : null;
      const body = typeof payload.body === "string" ? payload.body : null;
      if (!title) return null;
      const lines = [`🔔 <b>${escHtml(title)}</b>`];
      if (body) lines.push(escHtml(body));
      return lines.join("\n");
    }
  }
}

export const TelegramProvider: NotificationProvider = {
  name: "telegram",

  async send(intent: NotificationIntent): Promise<void> {
    const conn = await prisma.telegramConnection.findUnique({
      where: { userId: intent.recipientId },
      select: { telegramChatId: true, status: true },
    });

    if (!conn || conn.status !== "CONNECTED" || !conn.telegramChatId) return;

    const enabled = await isPreferenceEnabled(intent.recipientId, intent.type, "telegram");
    if (!enabled) return;

    // Determine user language for bilingual templates.
    // Falls back to English — future: read from user profile or Telegram language_code.
    const lang: Lang = "ar"; // TODO: read from user preferences when added

    const msg = formatMessage(intent, lang);
    if (!msg) return;

    const result = await sendMessage(conn.telegramChatId, msg);

    // 403 = user blocked the bot. Mark connection BLOCKED and audit it.
    if (!result.ok && result.errorCode === 403) {
      prisma.telegramConnection
        .update({
          where: { userId: intent.recipientId },
          data: { status: "BLOCKED" },
        })
        .catch((e) => console.error("[TelegramProvider] failed to mark BLOCKED:", e));

      prisma.telegramConnectionAudit
        .create({
          data: {
            actorId: intent.recipientId,
            targetUserId: intent.recipientId,
            action: "blocked",
            method: "SELF",
          },
        })
        .catch((e) => console.error("[TelegramProvider] failed to write blocked audit:", e));
    }
  },
};
