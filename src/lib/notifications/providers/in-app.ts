import "server-only";
import { subHours } from "date-fns";
import { prisma } from "@/lib/prisma";
import { NotificationCategory } from "@prisma/client";
import type { NotificationProvider, NotificationIntent } from "../types";

const VALID_CATEGORIES = new Set<string>(Object.values(NotificationCategory));

function toCategory(value: unknown): NotificationCategory {
  const s = typeof value === "string" ? value : "";
  return VALID_CATEGORIES.has(s) ? (s as NotificationCategory) : NotificationCategory.INFO;
}

const DEDUP_HOURS = 24;

export const InAppProvider: NotificationProvider = {
  name: "in-app",

  async send(intent: NotificationIntent): Promise<void> {
    const { recipientId, type, payload, entityType, entityId } = intent;

    const existing = await prisma.notification.findFirst({
      where: {
        recipientId,
        type,
        ...(entityId ? { entityId } : {}),
        createdAt: { gte: subHours(new Date(), DEDUP_HOURS) },
      },
      select: { id: true },
    });
    if (existing) return;

    await prisma.notification.create({
      data: {
        recipientId,
        type,
        category: toCategory(payload.category),
        title: (payload.title as string) ?? type,
        body: (payload.body as string) ?? null,
        entityType: entityType ?? null,
        entityId: entityId ?? null,
        priority: (payload.priority as number) ?? 0,
      },
    });
  },
};
