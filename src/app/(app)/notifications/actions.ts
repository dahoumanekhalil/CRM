"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export type NotificationRow = {
  id: string;
  type: string;
  category: "ACTION_REQUIRED" | "INFO" | "SUCCESS" | "SYSTEM";
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  read: boolean;
  priority: number;
  createdAt: string; // ISO string — safe to pass to client
};

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

export async function fetchNotifications(
  limit = 30
): Promise<NotificationRow[]> {
  const userId = await requireUserId();
  const rows = await prisma.notification.findMany({
    where: { recipientId: userId },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      type: true,
      category: true,
      title: true,
      body: true,
      entityType: true,
      entityId: true,
      read: true,
      priority: true,
      createdAt: true,
    },
  });
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const userId = await requireUserId();
    return await prisma.notification.count({
      where: { recipientId: userId, read: false },
    });
  } catch {
    return 0;
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.notification.updateMany({
    where: { id, recipientId: userId },
    data: { read: true, readAt: new Date() },
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  const userId = await requireUserId();
  await prisma.notification.updateMany({
    where: { recipientId: userId, read: false },
    data: { read: true, readAt: new Date() },
  });
}
