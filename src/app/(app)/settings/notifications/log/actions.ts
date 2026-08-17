"use server";

import { z } from "zod";
import { ScheduledNotificationStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermissionAction } from "@/lib/auth-guards";

const VALID_STATUSES = new Set<string>(Object.values(ScheduledNotificationStatus));

function toStatus(v: string | undefined): ScheduledNotificationStatus | undefined {
  if (!v || !VALID_STATUSES.has(v)) return undefined;
  return v as ScheduledNotificationStatus;
}

const filtersSchema = z.object({
  status: z.string().optional(),
  recipient: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type LogFilters = z.infer<typeof filtersSchema>;

export type LogRow = {
  id: string;
  type: string;
  recipientId: string;
  recipientName: string | null;
  recipientEmail: string;
  provider: string;
  scheduledAt: string;
  sentAt: string | null;
  lastAttemptAt: string | null;
  status: string;
  entityType: string | null;
  entityId: string | null;
  attemptCount: number;
  failureReason: string | null;
  payloadTitle: string | null;
  payloadBody: string | null;
};

export type LogResult = {
  rows: LogRow[];
  total: number;
  page: number;
  pageSize: number;
};

export async function getDeliveryLog(rawFilters: Partial<LogFilters>): Promise<LogResult> {
  await requirePermissionAction("settings.view");

  const f = filtersSchema.parse(rawFilters);

  const where: Prisma.ScheduledNotificationWhereInput = {
    ...(toStatus(f.status) ? { status: toStatus(f.status) } : {}),
    ...(f.recipient
      ? {
          recipient: {
            OR: [
              { name: { contains: f.recipient, mode: "insensitive" } },
              { email: { contains: f.recipient, mode: "insensitive" } },
            ],
          },
        }
      : {}),
    ...((f.from || f.to)
      ? {
          scheduledAt: {
            ...(f.from ? { gte: new Date(f.from) } : {}),
            ...(f.to ? { lte: new Date(`${f.to}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
  };

  const [records, total] = await Promise.all([
    prisma.scheduledNotification.findMany({
      where,
      include: { recipient: { select: { name: true, email: true } } },
      orderBy: { scheduledAt: "desc" },
      take: f.pageSize,
      skip: (f.page - 1) * f.pageSize,
    }),
    prisma.scheduledNotification.count({ where }),
  ]);

  const rows: LogRow[] = records.map((r) => {
    const p = r.payload as Record<string, unknown>;
    return {
      id: r.id,
      type: r.type,
      recipientId: r.recipientId,
      recipientName: r.recipient.name ?? null,
      recipientEmail: r.recipient.email,
      provider: r.provider,
      scheduledAt: r.scheduledAt.toISOString(),
      sentAt: r.sentAt?.toISOString() ?? null,
      lastAttemptAt: r.lastAttemptAt?.toISOString() ?? null,
      status: r.status,
      entityType: r.entityType,
      entityId: r.entityId,
      attemptCount: r.attemptCount,
      failureReason: r.failureReason,
      payloadTitle: typeof p.title === "string" ? p.title : null,
      payloadBody: typeof p.body === "string" && p.body ? p.body : null,
    };
  });

  return { rows, total, page: f.page, pageSize: f.pageSize };
}
