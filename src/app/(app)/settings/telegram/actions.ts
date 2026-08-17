"use server";

import { randomBytes } from "crypto";
import { addMinutes, subHours } from "date-fns";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermissionAction } from "@/lib/auth-guards";

// ── Shared token constants (mirror of notifications/actions.ts) ────────────────

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

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

// ── Shared types ───────────────────────────────────────────────────────────────

export type GenerateTokenResult = {
  token: string;
  expiresAt: string;
  botUrl: string;
};

export type EmployeeTelegramRow = {
  userId: string;
  userName: string | null;
  userEmail: string;
  userRole: string;
  status: string | null;
  connectionMethod: string | null;
  username: string | null;
  connectedAt: string | null;
  disconnectedAt: string | null;
};

// ── Input validation ───────────────────────────────────────────────────────────

const targetSchema = z.object({
  targetUserId: z.string().cuid(),
});

const revokeSchema = z.object({
  targetUserId: z.string().cuid(),
  reason: z.string().max(500).optional(),
});

// ── Internal helper ────────────────────────────────────────────────────────────

async function checkRateLimit(targetUserId: string): Promise<boolean> {
  const count = await prisma.telegramLinkToken.count({
    where: {
      employeeId: targetUserId,
      createdAt: { gte: subHours(new Date(), 1) },
    },
  });
  return count < RATE_LIMIT_PER_HOUR;
}

// ── TASK 2.4 — Administrator-assisted linking ──────────────────────────────────
// Admin generates a link token on behalf of any employee.
// The employee still has to open the bot and complete the flow themselves —
// this proves they control the Telegram account.

export async function generateLinkTokenForUser(
  targetUserId: string,
): Promise<Result<GenerateTokenResult>> {
  const session = await requirePermissionAction("telegram.admin");

  const parsed = targetSchema.safeParse({ targetUserId });
  if (!parsed.success) return { ok: false, error: "Invalid user ID." };

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.targetUserId },
    select: { id: true, name: true },
  });
  if (!target) return { ok: false, error: "User not found." };

  const withinLimit = await checkRateLimit(parsed.data.targetUserId);
  if (!withinLimit) {
    return { ok: false, error: "Too many link requests for this user. Please wait before trying again." };
  }

  // Expire (not delete) so the rate-limit count still includes these rows.
  await prisma.telegramLinkToken.updateMany({
    where: { employeeId: parsed.data.targetUserId, usedAt: null },
    data: { expiresAt: new Date() },
  });

  const token = generateToken();
  const expiresAt = addMinutes(new Date(), TOKEN_TTL_MINUTES);

  try {
    await prisma.$transaction([
      prisma.telegramLinkToken.create({
        data: {
          employeeId: parsed.data.targetUserId,
          token,
          expiresAt,
          initiatedById: session.user.id,
          connectionMethod: "ADMIN",
        },
      }),
      prisma.telegramConnectionAudit.create({
        data: {
          actorId: session.user.id,
          targetUserId: parsed.data.targetUserId,
          action: "admin_initiated",
          method: "ADMIN",
          metadata: { targetName: target.name } as Prisma.InputJsonValue,
        },
      }),
    ]);

    const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? "";
    const botUrl = botUsername ? `https://t.me/${botUsername}?start=${token}` : "";

    return {
      ok: true,
      data: { token, expiresAt: expiresAt.toISOString(), botUrl },
    };
  } catch (err) {
    console.error("[generateLinkTokenForUser] failed:", err);
    return { ok: false, error: "Couldn't generate a link token. Please try again." };
  }
}

// ── TASK 2.5 — Manager-assisted linking ────────────────────────────────────────
// Manager generates a link token for employees in their permitted scope.
// Managers cannot target other ADMINs or MANAGERs.

export async function generateLinkTokenAsManager(
  targetUserId: string,
): Promise<Result<GenerateTokenResult>> {
  const session = await requirePermissionAction("telegram.manage");

  const parsed = targetSchema.safeParse({ targetUserId });
  if (!parsed.success) return { ok: false, error: "Invalid user ID." };

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.targetUserId },
    select: { id: true, name: true, role: true },
  });
  if (!target) return { ok: false, error: "User not found." };

  // Scope enforcement — managers cannot manage admin or manager accounts.
  if (["ADMIN", "MANAGER"].includes(target.role)) {
    return {
      ok: false,
      error: "You don't have permission to manage Telegram connections for this account.",
    };
  }

  const withinLimit = await checkRateLimit(parsed.data.targetUserId);
  if (!withinLimit) {
    return { ok: false, error: "Too many link requests for this user. Please wait before trying again." };
  }

  // Expire (not delete) so the rate-limit count still includes these rows.
  await prisma.telegramLinkToken.updateMany({
    where: { employeeId: parsed.data.targetUserId, usedAt: null },
    data: { expiresAt: new Date() },
  });

  const token = generateToken();
  const expiresAt = addMinutes(new Date(), TOKEN_TTL_MINUTES);

  try {
    await prisma.$transaction([
      prisma.telegramLinkToken.create({
        data: {
          employeeId: parsed.data.targetUserId,
          token,
          expiresAt,
          initiatedById: session.user.id,
          connectionMethod: "MANAGER",
        },
      }),
      prisma.telegramConnectionAudit.create({
        data: {
          actorId: session.user.id,
          targetUserId: parsed.data.targetUserId,
          action: "manager_initiated",
          method: "MANAGER",
          metadata: { targetName: target.name } as Prisma.InputJsonValue,
        },
      }),
    ]);

    const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? "";
    const botUrl = botUsername ? `https://t.me/${botUsername}?start=${token}` : "";

    return {
      ok: true,
      data: { token, expiresAt: expiresAt.toISOString(), botUrl },
    };
  } catch (err) {
    console.error("[generateLinkTokenAsManager] failed:", err);
    return { ok: false, error: "Couldn't generate a link token. Please try again." };
  }
}

// ── Admin revoke ───────────────────────────────────────────────────────────────

export async function revokeConnectionAsAdmin(
  targetUserId: string,
  reason?: string,
): Promise<Result<null>> {
  const session = await requirePermissionAction("telegram.admin");

  const parsed = revokeSchema.safeParse({ targetUserId, reason });
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.targetUserId },
    select: { id: true },
  });
  if (!target) return { ok: false, error: "User not found." };

  try {
    await prisma.$transaction([
      prisma.telegramConnection.updateMany({
        where: {
          userId: parsed.data.targetUserId,
          status: { in: ["CONNECTED", "PENDING", "DISABLED"] },
        },
        data: { status: "REVOKED", disconnectedAt: new Date() },
      }),
      prisma.telegramLinkToken.deleteMany({
        where: { employeeId: parsed.data.targetUserId, usedAt: null },
      }),
      prisma.telegramConnectionAudit.create({
        data: {
          actorId: session.user.id,
          targetUserId: parsed.data.targetUserId,
          action: "revoked",
          method: "ADMIN",
          reason: parsed.data.reason ?? null,
        },
      }),
    ]);

    revalidatePath("/settings/telegram");
    return { ok: true, data: null };
  } catch (err) {
    console.error("[revokeConnectionAsAdmin] failed:", err);
    return { ok: false, error: "Couldn't revoke this connection. Please try again." };
  }
}

// ── Data queries ───────────────────────────────────────────────────────────────

function mapUserRow(u: {
  id: string;
  name: string | null;
  email: string;
  role: string;
  telegramConnection: {
    status: string;
    connectionMethod: string;
    username: string | null;
    connectedAt: Date | null;
    disconnectedAt: Date | null;
  } | null;
}): EmployeeTelegramRow {
  return {
    userId: u.id,
    userName: u.name,
    userEmail: u.email,
    userRole: u.role,
    status: u.telegramConnection?.status ?? null,
    connectionMethod: u.telegramConnection?.connectionMethod ?? null,
    username: u.telegramConnection?.username ?? null,
    connectedAt: u.telegramConnection?.connectedAt?.toISOString() ?? null,
    disconnectedAt: u.telegramConnection?.disconnectedAt?.toISOString() ?? null,
  };
}

const connectionSelect = {
  status: true,
  connectionMethod: true,
  username: true,
  connectedAt: true,
  disconnectedAt: true,
} as const;

// Admin: all users
export async function getEmployeeTelegramList(): Promise<EmployeeTelegramRow[]> {
  await requirePermissionAction("telegram.admin");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      telegramConnection: { select: connectionSelect },
    },
    orderBy: { name: "asc" },
  });

  return users.map(mapUserRow);
}

// Manager: non-admin, non-manager users only
export async function getEmployeeTelegramListForManager(): Promise<EmployeeTelegramRow[]> {
  await requirePermissionAction("telegram.manage");

  const users = await prisma.user.findMany({
    where: { role: { notIn: ["ADMIN", "MANAGER"] } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      telegramConnection: { select: connectionSelect },
    },
    orderBy: { name: "asc" },
  });

  return users.map(mapUserRow);
}
