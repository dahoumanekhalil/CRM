// Telegram webhook — receives Update objects from the Telegram Bot API.
//
// Security model:
//   • Every request MUST carry X-Telegram-Bot-Api-Secret-Token matching TELEGRAM_WEBHOOK_SECRET.
//   • Invalid or missing token → log + return 200 (returning non-2xx causes Telegram to retry,
//     which would amplify attacker traffic; 200 with no body gives attackers no signal).
//   • All Telegram API calls (sendMessage) are wrapped in try/catch in the client module.
//   • Body is size-capped before parsing JSON.

import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendMessage } from "@/lib/telegram/client";
import {
  msgWelcome,
  msgHelp,
  msgStatusConnected,
  msgStatusNotConnected,
  msgNotificationPrefs,
  msgLinkSuccess,
  msgLinkExpired,
  msgLinkUsed,
  msgLinkInvalid,
  msgLinkAlreadyConnected,
  type Lang,
} from "@/lib/telegram/message-templates";

// ── Types (minimal surface for the subset of Telegram Updates we process) ─────

interface TgUser {
  id: number;
  first_name: string;
  username?: string;
  language_code?: string;
}

interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: { id: number; type: string };
  text?: string;
}

interface TgUpdate {
  update_id: number;
  message?: TgMessage;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ok = () => new NextResponse(null, { status: 200 });

function getLang(from: TgUser | undefined): Lang {
  return from?.language_code?.startsWith("ar") ? "ar" : "en";
}

// ── Link command handler ──────────────────────────────────────────────────────

async function handleLinkCommand(
  chatId: number,
  token: string,
  from: TgUser | undefined,
  lang: Lang
): Promise<void> {
  const record = await prisma.telegramLinkToken.findUnique({
    where: { token },
    select: { employeeId: true, expiresAt: true, usedAt: true, initiatedById: true, connectionMethod: true },
  });

  if (!record) {
    await sendMessage(chatId, msgLinkInvalid(lang));
    return;
  }
  if (record.usedAt !== null) {
    await sendMessage(chatId, msgLinkUsed(lang));
    return;
  }
  if (record.expiresAt < new Date()) {
    await sendMessage(chatId, msgLinkExpired(lang));
    return;
  }

  // Guard: this Telegram chat is already linked to a different employee.
  const alreadyLinked = await prisma.telegramConnection.findFirst({
    where: { telegramChatId: String(chatId), status: "CONNECTED" },
    select: { userId: true },
  });
  if (alreadyLinked && alreadyLinked.userId !== record.employeeId) {
    await sendMessage(chatId, msgLinkAlreadyConnected(lang));
    return;
  }

  // Capture previous status before upsert to determine audit action.
  const previousConn = await prisma.telegramConnection.findUnique({
    where: { userId: record.employeeId },
    select: { status: true },
  });

  const now = new Date();
  const connectionMethod = record.connectionMethod === "ADMIN"
    ? "ADMIN"
    : record.connectionMethod === "MANAGER"
    ? "MANAGER"
    : "SELF";

  // Atomically claim the token by marking it used only if it is still unused.
  // Using updateMany with `usedAt: null` in the where clause ensures that if two
  // concurrent requests race past the usedAt check above, only one wins here.
  const claimed = await prisma.telegramLinkToken.updateMany({
    where: { token, usedAt: null },
    data: { usedAt: now },
  });
  if (claimed.count === 0) {
    // Another concurrent request already consumed this token.
    await sendMessage(chatId, msgLinkUsed(lang));
    return;
  }

  // Token is now claimed — upsert the TelegramConnection.
  try {
    await prisma.$transaction([
      prisma.telegramConnection.upsert({
        where: { userId: record.employeeId },
        create: {
          userId: record.employeeId,
          telegramChatId: String(chatId),
          username: from?.username ?? null,
          firstName: from?.first_name ?? null,
          status: "CONNECTED",
          connectionMethod: connectionMethod as "SELF" | "ADMIN" | "MANAGER",
          connectedById: record.initiatedById ?? record.employeeId,
          connectedAt: now,
        },
        update: {
          telegramChatId: String(chatId),
          username: from?.username ?? null,
          firstName: from?.first_name ?? null,
          status: "CONNECTED",
          connectionMethod: connectionMethod as "SELF" | "ADMIN" | "MANAGER",
          connectedById: record.initiatedById ?? record.employeeId,
          connectedAt: now,
          disconnectedAt: null,
        },
      }),
    ]);

    // Write audit record — non-blocking so a DB hiccup here never kills the linking flow.
    const wasReconnect =
      previousConn !== null &&
      (previousConn.status === "DISABLED" || previousConn.status === "REVOKED");
    const auditAction = wasReconnect ? "re_linked" : "connected";
    const auditMetadata: Prisma.InputJsonValue | undefined = record.initiatedById
      ? { initiatedById: record.initiatedById }
      : undefined;
    prisma.telegramConnectionAudit
      .create({
        data: {
          actorId: record.employeeId,
          targetUserId: record.employeeId,
          action: auditAction,
          method: connectionMethod,
          metadata: auditMetadata,
        },
      })
      .catch((auditErr) =>
        console.error("[telegram/webhook] audit write failed:", auditErr)
      );

    await sendMessage(chatId, msgLinkSuccess(lang));
  } catch (err) {
    console.error("[telegram/webhook] handleLinkCommand transaction failed:", err);
    await sendMessage(chatId, msgLinkInvalid(lang));
  }
}

// ── /help command handler ─────────────────────────────────────────────────────

async function handleHelpCommand(chatId: number, lang: Lang): Promise<void> {
  await sendMessage(chatId, msgHelp(lang));
}

// ── /status command handler ───────────────────────────────────────────────────

async function handleStatusCommand(chatId: number, lang: Lang): Promise<void> {
  const conn = await prisma.telegramConnection.findFirst({
    where: { telegramChatId: String(chatId), status: "CONNECTED" },
    include: { user: { select: { name: true } } },
  });
  if (!conn) {
    await sendMessage(chatId, msgStatusNotConnected(lang));
    return;
  }
  await sendMessage(chatId, msgStatusConnected(conn.user.name, lang));
}

// ── /notifications command handler ───────────────────────────────────────────

async function handleNotificationsCommand(
  chatId: number,
  lang: Lang
): Promise<void> {
  const conn = await prisma.telegramConnection.findFirst({
    where: { telegramChatId: String(chatId), status: "CONNECTED" },
    select: { userId: true },
  });
  if (!conn) {
    await sendMessage(chatId, msgStatusNotConnected(lang));
    return;
  }
  const prefs = await prisma.notificationPreference.findMany({
    where: { employeeId: conn.userId, channel: "telegram" },
    select: { type: true, enabled: true },
  });
  const prefsMap: Record<string, boolean> = {};
  for (const p of prefs) prefsMap[p.type] = p.enabled;
  await sendMessage(chatId, msgNotificationPrefs(prefsMap, lang));
}

// ── Route handler ─────────────────────────────────────────────────────────────

const MAX_BODY_BYTES = 64 * 1024; // 64 KB — Telegram updates are never larger

export async function POST(request: Request): Promise<NextResponse> {
  // 1. Validate secret header BEFORE touching the body.
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const incoming = request.headers.get("x-telegram-bot-api-secret-token");

  if (!secret || !incoming || incoming !== secret) {
    console.warn(
      "[telegram/webhook] rejected request — invalid or missing secret token"
    );
    // Return 200 to prevent Telegram retry storms if secret ever changes.
    return ok();
  }

  // 2. Body size guard.
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    console.warn("[telegram/webhook] oversized body rejected:", contentLength);
    return ok();
  }

  // 3. Parse JSON body.
  let update: TgUpdate;
  try {
    update = (await request.json()) as TgUpdate;
  } catch {
    console.warn("[telegram/webhook] failed to parse JSON body");
    return ok();
  }

  // 4. We only handle message updates with text commands.
  const msg = update.message;
  if (!msg?.text) return ok();

  const chatId = msg.chat.id;
  const lang = getLang(msg.from);
  const text = msg.text.trim();

  // 5. Route commands.
  // Split on whitespace or @ to handle both "/cmd arg" and "/cmd@BotName arg" formats.
  const command = text.split(/[\s@]/)[0]?.toLowerCase() ?? "";
  const args = text.split(/\s+/).slice(1);

  if (command === "/start") {
    const token = args[0]?.trim() ?? "";
    if (token) {
      await handleLinkCommand(chatId, token, msg.from, lang);
    } else {
      await sendMessage(chatId, msgWelcome(lang));
    }
    return ok();
  }

  if (command === "/link") {
    const token = args[0]?.trim() ?? "";
    if (!token) {
      await sendMessage(chatId, msgLinkInvalid(lang));
      return ok();
    }
    await handleLinkCommand(chatId, token, msg.from, lang);
    return ok();
  }

  if (command === "/help") {
    await handleHelpCommand(chatId, lang);
    return ok();
  }

  if (command === "/status") {
    await handleStatusCommand(chatId, lang);
    return ok();
  }

  if (command === "/notifications") {
    await handleNotificationsCommand(chatId, lang);
    return ok();
  }

  // Unknown commands are silently ignored — no need to reply to every message.
  return ok();
}
