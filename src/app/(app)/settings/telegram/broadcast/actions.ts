"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermissionAction } from "@/lib/auth-guards";
import { sendMessage } from "@/lib/telegram/client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ConnectedAccount {
  userId: string;
  name: string;
  email: string;
  role: string;
  chatId: string;
  username: string | null;
  telegramFirstName: string | null;
}

export type BroadcastTargetType = "all" | "roles" | "users";

export interface SendBroadcastInput {
  message: string;
  targetType: BroadcastTargetType;
  targetRoles: string[];
  targetUserIds: string[];
}

export interface BroadcastResult {
  ok: boolean;
  broadcastId?: string;
  sent: number;
  failed: number;
  error?: string;
}

export interface BroadcastHistoryRow {
  id: string;
  message: string;
  sentByName: string;
  sentByEmail: string;
  targetType: string;
  targetRoles: string[];
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
}

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getConnectedAccounts(): Promise<ConnectedAccount[]> {
  await requirePermissionAction("telegram.admin");

  const rows = await prisma.telegramConnection.findMany({
    where: {
      status: "CONNECTED",
      telegramChatId: { not: null },
    },
    select: {
      telegramChatId: true,
      username: true,
      firstName: true,
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  return rows
    .filter((r) => r.telegramChatId)
    .map((r) => ({
      userId: r.user.id,
      name: r.user.name ?? r.user.email,
      email: r.user.email,
      role: r.user.role,
      chatId: r.telegramChatId!,
      username: r.username,
      telegramFirstName: r.firstName,
    }));
}

export async function getBroadcastHistory(): Promise<BroadcastHistoryRow[]> {
  await requirePermissionAction("telegram.admin");

  const broadcasts = await prisma.telegramBroadcast.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  if (broadcasts.length === 0) return [];

  const senderIds = [...new Set(broadcasts.map((b) => b.sentById))];
  const senders = await prisma.user.findMany({
    where: { id: { in: senderIds } },
    select: { id: true, name: true, email: true },
  });
  const senderMap = new Map(senders.map((s) => [s.id, s]));

  return broadcasts.map((b) => {
    const sender = senderMap.get(b.sentById);
    return {
      id: b.id,
      message: b.message,
      sentByName: sender?.name ?? sender?.email ?? "Unknown",
      sentByEmail: sender?.email ?? "",
      targetType: b.targetType,
      targetRoles: b.targetRoles,
      recipientCount: b.recipientCount,
      sentCount: b.sentCount,
      failedCount: b.failedCount,
      createdAt: b.createdAt.toISOString(),
    };
  });
}

// ── Broadcast action ──────────────────────────────────────────────────────────

export async function sendBroadcast(
  input: SendBroadcastInput
): Promise<Result<BroadcastResult>> {
  try {
    const session = await requirePermissionAction("telegram.admin");

    if (!input.message.trim()) {
      return { ok: false, error: "Message cannot be empty." };
    }
    if (input.message.length > 4096) {
      return { ok: false, error: "Message exceeds 4096 characters (Telegram limit)." };
    }

    // Resolve recipients
    const allAccounts = await prisma.telegramConnection.findMany({
      where: { status: "CONNECTED", telegramChatId: { not: null } },
      select: {
        telegramChatId: true,
        user: { select: { id: true, role: true } },
      },
    });

    let recipients = allAccounts.filter((r) => r.telegramChatId);

    if (input.targetType === "roles" && input.targetRoles.length > 0) {
      const roleSet = new Set(input.targetRoles);
      recipients = recipients.filter((r) => roleSet.has(r.user.role));
    } else if (input.targetType === "users" && input.targetUserIds.length > 0) {
      const idSet = new Set(input.targetUserIds);
      recipients = recipients.filter((r) => idSet.has(r.user.id));
    }

    if (recipients.length === 0) {
      return { ok: false, error: "No connected accounts match the selected recipients." };
    }

    // Send messages
    let sent = 0;
    let failed = 0;

    for (const r of recipients) {
      const result = await sendMessage(r.telegramChatId!, input.message, {
        parseMode: "HTML",
        disableWebPagePreview: true,
      });
      if (result.ok) sent++;
      else failed++;
    }

    // Store broadcast record
    const broadcast = await prisma.telegramBroadcast.create({
      data: {
        message: input.message,
        sentById: session.user.id,
        targetType: input.targetType,
        targetRoles: input.targetType === "roles" ? input.targetRoles : [],
        targetUserIds: input.targetType === "users" ? input.targetUserIds : [],
        recipientCount: recipients.length,
        sentCount: sent,
        failedCount: failed,
      },
    });

    revalidatePath("/settings/telegram/broadcast");

    return {
      ok: true,
      data: { ok: true, broadcastId: broadcast.id, sent, failed },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Broadcast failed." };
  }
}
