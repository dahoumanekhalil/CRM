import "server-only";
import { subHours, subMinutes } from "date-fns";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function enqueueNotification(
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
