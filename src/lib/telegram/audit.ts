import "server-only";
import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "connected"
  | "disconnected"
  | "revoked"
  | "admin_initiated"
  | "manager_initiated"
  | "re_linked"
  | "blocked"
  | "error_reset";

export type AuditEntry = {
  id: string;
  actorId: string;
  actorName: string | null;
  targetUserId: string;
  targetUserName: string | null;
  action: string;
  method: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

export async function recordAudit(opts: {
  actorId: string;
  targetUserId: string;
  action: AuditAction;
  method?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.telegramConnectionAudit.create({
    data: {
      actorId: opts.actorId,
      targetUserId: opts.targetUserId,
      action: opts.action,
      method: opts.method ?? null,
      reason: opts.reason ?? null,
      metadata: opts.metadata ? (opts.metadata as import("@prisma/client").Prisma.InputJsonValue) : undefined,
    },
  });
}

export async function getAuditLog(
  targetUserId?: string,
  limit = 50,
): Promise<AuditEntry[]> {
  const records = await prisma.telegramConnectionAudit.findMany({
    where: targetUserId ? { targetUserId } : undefined,
    include: {
      actor: { select: { name: true } },
      targetUser: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return records.map((r) => ({
    id: r.id,
    actorId: r.actorId,
    actorName: r.actor.name,
    targetUserId: r.targetUserId,
    targetUserName: r.targetUser.name,
    action: r.action,
    method: r.method,
    reason: r.reason,
    metadata: r.metadata as Record<string, unknown> | null,
    createdAt: r.createdAt,
  }));
}
