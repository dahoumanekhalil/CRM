import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type RecordActivityParams = {
  type: string;
  entity: string;
  entityId: string;
  userId?: string | null;
  meta?: Record<string, unknown> | null;
};

export async function recordActivity(params: RecordActivityParams): Promise<void> {
  try {
    await prisma.activity.create({
      data: {
        type: params.type,
        entity: params.entity,
        entityId: params.entityId,
        userId: params.userId ?? null,
        meta: params.meta != null
          ? (params.meta as Prisma.InputJsonValue)
          : undefined,
      },
    });
  } catch (err) {
    console.error("[recordActivity] failed:", err);
  }
}

export type ActivityRow = {
  id: string;
  type: string;
  entity: string;
  entityId: string;
  meta: unknown;
  createdAt: Date;
  user: { id: string; name: string | null; email: string } | null;
};

export async function getActivitiesForEntity(
  entity: string,
  entityId: string,
  limit = 100
): Promise<ActivityRow[]> {
  return prisma.activity.findMany({
    where: { entity, entityId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
}
