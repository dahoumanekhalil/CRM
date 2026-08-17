import "server-only";
import { prisma } from "@/lib/prisma";
import type { TelegramConnectionStatus, TelegramConnectionMethod } from "@prisma/client";

export type ConnectionInfo = {
  id: string;
  userId: string;
  status: TelegramConnectionStatus;
  connectionMethod: TelegramConnectionMethod;
  username: string | null;
  firstName: string | null;
  telegramChatId: string | null;
  connectedAt: Date | null;
  disconnectedAt: Date | null;
  connectedById: string | null;
};

export async function getConnection(userId: string): Promise<ConnectionInfo | null> {
  return prisma.telegramConnection.findUnique({
    where: { userId },
    select: {
      id: true,
      userId: true,
      status: true,
      connectionMethod: true,
      username: true,
      firstName: true,
      telegramChatId: true,
      connectedAt: true,
      disconnectedAt: true,
      connectedById: true,
    },
  });
}

export async function isConnected(userId: string): Promise<boolean> {
  const conn = await prisma.telegramConnection.findUnique({
    where: { userId },
    select: { status: true },
  });
  return conn?.status === "CONNECTED";
}

export async function revokeConnection(
  actorId: string,
  targetUserId: string,
  reason?: string,
): Promise<void> {
  const now = new Date();
  await prisma.$transaction([
    prisma.telegramConnection.updateMany({
      where: { userId: targetUserId, status: { in: ["CONNECTED", "PENDING", "DISABLED"] } },
      data: { status: "REVOKED", disconnectedAt: now },
    }),
    prisma.telegramLinkToken.deleteMany({
      where: { employeeId: targetUserId, usedAt: null },
    }),
    prisma.telegramConnectionAudit.create({
      data: {
        actorId,
        targetUserId,
        action: "revoked",
        reason: reason ?? null,
      },
    }),
  ]);
}

export async function getAllConnectionsForAdmin(): Promise<
  Array<{
    userId: string;
    userName: string | null;
    userEmail: string;
    userRole: string;
    status: TelegramConnectionStatus | null;
    connectionMethod: TelegramConnectionMethod | null;
    username: string | null;
    connectedAt: Date | null;
    disconnectedAt: Date | null;
  }>
> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      telegramConnection: {
        select: {
          status: true,
          connectionMethod: true,
          username: true,
          connectedAt: true,
          disconnectedAt: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return users.map((u) => ({
    userId: u.id,
    userName: u.name,
    userEmail: u.email,
    userRole: u.role,
    status: u.telegramConnection?.status ?? null,
    connectionMethod: u.telegramConnection?.connectionMethod ?? null,
    username: u.telegramConnection?.username ?? null,
    connectedAt: u.telegramConnection?.connectedAt ?? null,
    disconnectedAt: u.telegramConnection?.disconnectedAt ?? null,
  }));
}
