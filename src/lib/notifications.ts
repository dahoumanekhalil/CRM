import "server-only";
import { subHours } from "date-fns";
import { prisma } from "@/lib/prisma";
import type { NotificationCategory } from "@prisma/client";

type CreateNotificationParams = {
  recipientId: string;
  type: string;
  category: NotificationCategory;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
  priority?: number;
};

// Deduplication window: skip if an identical notification was sent within 24h.
const DEDUP_WINDOW_HOURS = 24;

export async function createNotification(
  params: CreateNotificationParams
): Promise<void> {
  try {
    const { recipientId, type, entityId } = params;

    // Skip if a matching notification already exists within the dedup window.
    const existing = await prisma.notification.findFirst({
      where: {
        recipientId,
        type,
        ...(entityId ? { entityId } : {}),
        createdAt: { gte: subHours(new Date(), DEDUP_WINDOW_HOURS) },
      },
      select: { id: true },
    });
    if (existing) return;

    await prisma.notification.create({
      data: {
        recipientId,
        type: params.type,
        category: params.category,
        title: params.title,
        body: params.body ?? null,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        priority: params.priority ?? 0,
      },
    });
  } catch (err) {
    console.error("[createNotification] failed:", err);
  }
}

export async function getUnreadCount(userId: string): Promise<number> {
  try {
    return await prisma.notification.count({
      where: { recipientId: userId, read: false },
    });
  } catch {
    return 0;
  }
}
