import "server-only";
import { prisma } from "@/lib/prisma";
import { sendMessage } from "@/lib/telegram/client";
import {
  escHtml,
  msgC5aTaskReminder,
  msgC5bOverdueTasks,
  msgC5cSessionReminder,
  msgC5dPaymentPending,
  msgC5eLeadAssigned,
  msgC5fDailyDigest,
  type DailyDigestStats,
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

function formatMessage(intent: NotificationIntent): string | null {
  const { type, payload } = intent;

  switch (type) {
    case "task.reminder":
      if (!payload.taskTitle) return null;
      return msgC5aTaskReminder(
        str(payload.taskTitle),
        deepLink("/tasks"),
      );

    case "task.overdue":
      return msgC5bOverdueTasks(
        num(payload.count) || 1,
        deepLink("/tasks"),
      );

    case "session.reminder":
      if (!payload.courseName) return null;
      return msgC5cSessionReminder(
        str(payload.courseName),
        str(payload.dateRange),
        str(payload.location),
        num(payload.registrationCount),
        deepLink(`/courses/${str(payload.courseSlug)}`),
      );

    case "payment.pending":
      if (!payload.studentName) return null;
      return msgC5dPaymentPending(
        str(payload.studentName),
        str(payload.amount),
        str(payload.currency),
        deepLink(`/payments`),
      );

    case "lead.assigned":
      if (!payload.leadName) return null;
      return msgC5eLeadAssigned(
        str(payload.leadName),
        typeof payload.courseName === "string" ? payload.courseName : null,
        deepLink(`/leads/${str(payload.leadId)}`),
      );

    case "daily.digest":
      if (!payload.date || !payload.stats) return null;
      return msgC5fDailyDigest(
        str(payload.date),
        payload.stats as DailyDigestStats,
      );

    default: {
      // Generic fallback for task.assigned, session.nearCapacity, course.update, etc.
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

    const msg = formatMessage(intent);
    if (!msg) return;

    const result = await sendMessage(conn.telegramChatId, msg);

    // 403 = user blocked the bot. Mark the connection and write an audit record.
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
