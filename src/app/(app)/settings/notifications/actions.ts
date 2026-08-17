"use server";

import { randomBytes } from "crypto";
import { addMinutes, subHours } from "date-fns";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermissionAction } from "@/lib/auth-guards";
import { NotificationTypes, type NotificationType } from "@/lib/notifications/types";
import {
  ensureDefaultPreferences,
  getPreferencesMap,
} from "@/lib/notifications/preferences";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

// Alphanumeric chars without visually ambiguous 0/O/1/I
const TOKEN_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TOKEN_LENGTH = 10; // 32^10 ≈ 2^50 — sufficient entropy for a 15-min single-use token
const TOKEN_TTL_MINUTES = 15;
const RATE_LIMIT_PER_HOUR = 5;

function generateToken(): string {
  const bytes = randomBytes(TOKEN_LENGTH);
  return Array.from(bytes)
    .map((b) => TOKEN_CHARS[b % TOKEN_CHARS.length])
    .join("");
}

// ── Read ──────────────────────────────────────────────────────────────────────

export type TelegramDisconnectReason = "BLOCKED" | "REVOKED" | "DISABLED" | "ERROR";

export type TelegramStatus =
  | { connected: true; username: string | null }
  | { connected: false; disconnectReason: TelegramDisconnectReason | null };

export async function getTelegramStatus(): Promise<TelegramStatus> {
  const session = await requirePermissionAction("notifications.view");
  const conn = await prisma.telegramConnection.findUnique({
    where: { userId: session.user.id },
    select: { status: true, username: true },
  });
  if (!conn) return { connected: false, disconnectReason: null };
  if (conn.status !== "CONNECTED") {
    const reason = (["BLOCKED", "REVOKED", "DISABLED", "ERROR"] as const).includes(
      conn.status as TelegramDisconnectReason,
    )
      ? (conn.status as TelegramDisconnectReason)
      : null;
    return { connected: false, disconnectReason: reason };
  }
  return { connected: true, username: conn.username ?? null };
}

// ── Token generation ──────────────────────────────────────────────────────────

export type GenerateTokenResult = {
  token: string;
  expiresAt: string; // ISO string
  botUrl: string;
};

export async function generateLinkToken(): Promise<Result<GenerateTokenResult>> {
  const session = await requirePermissionAction("notifications.write");

  // Rate limit: prevent abuse (max 5 tokens per hour per user)
  const recentCount = await prisma.telegramLinkToken.count({
    where: {
      employeeId: session.user.id,
      createdAt: { gte: subHours(new Date(), 1) },
    },
  });
  if (recentCount >= RATE_LIMIT_PER_HOUR) {
    return { ok: false, error: "Too many link requests. Please wait a while before trying again." };
  }

  // Invalidate existing unused tokens by expiring them immediately.
  // Using updateMany (not deleteMany) preserves the rows so the rate-limit count
  // query above still sees them on the next request, preventing bypass.
  await prisma.telegramLinkToken.updateMany({
    where: { employeeId: session.user.id, usedAt: null },
    data: { expiresAt: new Date() },
  });

  const token = generateToken();
  const expiresAt = addMinutes(new Date(), TOKEN_TTL_MINUTES);

  try {
    await prisma.telegramLinkToken.create({
      data: {
        employeeId: session.user.id,
        token,
        expiresAt,
        connectionMethod: "SELF",
      },
    });

    const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? "";
    // Use the /start deep-link format so the token is handled automatically
    const botUrl = botUsername ? `https://t.me/${botUsername}?start=${token}` : "";

    return {
      ok: true,
      data: { token, expiresAt: expiresAt.toISOString(), botUrl },
    };
  } catch (err) {
    console.error("generateLinkToken failed:", err);
    return { ok: false, error: "Couldn't generate a link token. Please try again." };
  }
}

// ── Polling ───────────────────────────────────────────────────────────────────

export async function pollLinkStatus(): Promise<TelegramStatus> {
  return getTelegramStatus();
}

// ── Disconnect ────────────────────────────────────────────────────────────────

export async function disconnectTelegram(): Promise<Result<null>> {
  const session = await requirePermissionAction("notifications.write");

  const now = new Date();

  try {
    await prisma.$transaction([
      // Mark the connection as DISABLED (preserves audit history).
      prisma.telegramConnection.updateMany({
        where: { userId: session.user.id, status: "CONNECTED" },
        data: { status: "DISABLED", disconnectedAt: now },
      }),
      // Remove all unused link tokens.
      prisma.telegramLinkToken.deleteMany({
        where: { employeeId: session.user.id, usedAt: null },
      }),
      // Record disconnect in audit trail.
      prisma.telegramConnectionAudit.create({
        data: {
          actorId: session.user.id,
          targetUserId: session.user.id,
          action: "disconnected",
          method: "SELF",
        },
      }),
    ]);

    revalidatePath("/settings/notifications");
    return { ok: true, data: null };
  } catch (err) {
    console.error("disconnectTelegram failed:", err);
    return { ok: false, error: "Couldn't disconnect Telegram. Please try again." };
  }
}

// ── Notification preferences ──────────────────────────────────────────────────

export type PreferencesRecord = Record<NotificationType, boolean>;

export async function getNotificationPreferences(): Promise<PreferencesRecord> {
  const session = await requirePermissionAction("notifications.view");
  // Seed defaults if this is the first visit — no-op if rows already exist.
  await ensureDefaultPreferences(session.user.id, "telegram");
  return getPreferencesMap(session.user.id, "telegram");
}

const VALID_TYPES = new Set<string>(Object.values(NotificationTypes));

const setPreferenceSchema = z.object({
  type: z.string().refine((v) => VALID_TYPES.has(v), { message: "Invalid notification type" }),
  enabled: z.boolean(),
});

export async function setNotificationPreference(
  type: NotificationType,
  enabled: boolean
): Promise<Result<null>> {
  const session = await requirePermissionAction("notifications.write");

  const parsed = setPreferenceSchema.safeParse({ type, enabled });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await prisma.notificationPreference.upsert({
      where: {
        employeeId_type_channel: {
          employeeId: session.user.id,
          type: parsed.data.type,
          channel: "telegram",
        },
      },
      create: {
        employeeId: session.user.id,
        type: parsed.data.type,
        channel: "telegram",
        enabled: parsed.data.enabled,
      },
      update: { enabled: parsed.data.enabled },
    });
    return { ok: true, data: null };
  } catch (err) {
    console.error("setNotificationPreference failed:", err);
    return { ok: false, error: "Couldn't save your preference. Please try again." };
  }
}
