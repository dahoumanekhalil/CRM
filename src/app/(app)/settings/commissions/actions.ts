"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermissionAction } from "@/lib/auth-guards";
import { recordActivity } from "@/lib/activity";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const createRuleSchema = z.object({
  name: z.string().min(1).max(120),
  fixedAmount: z.number().positive(),
  currency: z.string().min(1).max(10).default("DZD"),
  refundRetentionPercent: z.number().min(0).max(100),
  courseId: z.string().optional().nullable(),
  effectiveFrom: z.string().optional(),
});

export type CommissionRuleRow = {
  id: string;
  name: string;
  fixedAmount: number;
  currency: string;
  refundRetentionPercent: number;
  isActive: boolean;
  courseId: string | null;
  courseName: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdByName: string | null;
  createdAt: string;
};

export async function listCommissionRules(): Promise<CommissionRuleRow[]> {
  await requirePermissionAction("settings.view");

  const rules = await prisma.commissionRule.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    include: {
      course: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });

  return rules.map((r) => ({
    id: r.id,
    name: r.name,
    fixedAmount: Number(String(r.fixedAmount)),
    currency: r.currency,
    refundRetentionPercent: Number(String(r.refundRetentionPercent)),
    isActive: r.isActive,
    courseId: r.courseId,
    courseName: r.course?.name ?? null,
    effectiveFrom: r.effectiveFrom.toISOString(),
    effectiveTo: r.effectiveTo?.toISOString() ?? null,
    createdByName: r.createdBy?.name ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function createCommissionRule(
  input: z.infer<typeof createRuleSchema>
): Promise<Result<{ id: string }>> {
  const parsed = createRuleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const session = await requirePermissionAction("settings.write");
  const d = parsed.data;

  const rule = await prisma.commissionRule.create({
    data: {
      name: d.name,
      fixedAmount: d.fixedAmount,
      currency: d.currency,
      refundRetentionPercent: d.refundRetentionPercent,
      courseId: d.courseId ?? null,
      isActive: false,
      effectiveFrom: d.effectiveFrom ? new Date(d.effectiveFrom) : new Date(),
      createdById: session.user.id,
    },
  });

  void recordActivity({
    type: "commission.rule_created",
    entity: "CommissionRule",
    entityId: rule.id,
    userId: session.user.id,
    meta: { name: d.name, fixedAmount: d.fixedAmount, currency: d.currency },
  });

  revalidatePath("/settings/commissions");
  return { ok: true, data: { id: rule.id } };
}

export async function activateCommissionRule(
  ruleId: string
): Promise<Result<void>> {
  const session = await requirePermissionAction("settings.write");

  const rule = await prisma.commissionRule.findUnique({
    where: { id: ruleId },
    select: { id: true, courseId: true },
  });
  if (!rule) return { ok: false, error: "Rule not found" };

  // Deactivate all existing active rules for the same scope (org or course)
  await prisma.$transaction([
    prisma.commissionRule.updateMany({
      where: { isActive: true, courseId: rule.courseId },
      data: { isActive: false, effectiveTo: new Date() },
    }),
    prisma.commissionRule.update({
      where: { id: ruleId },
      data: { isActive: true, effectiveFrom: new Date(), effectiveTo: null },
    }),
  ]);

  void recordActivity({
    type: "commission.rule_activated",
    entity: "CommissionRule",
    entityId: ruleId,
    userId: session.user.id,
  });

  revalidatePath("/settings/commissions");
  return { ok: true, data: undefined };
}

export async function deactivateCommissionRule(
  ruleId: string
): Promise<Result<void>> {
  const session = await requirePermissionAction("settings.write");

  await prisma.commissionRule.update({
    where: { id: ruleId },
    data: { isActive: false, effectiveTo: new Date() },
  });

  void recordActivity({
    type: "commission.rule_deactivated",
    entity: "CommissionRule",
    entityId: ruleId,
    userId: session.user.id,
  });

  revalidatePath("/settings/commissions");
  return { ok: true, data: undefined };
}

export async function listCoursesForRulePicker() {
  await requirePermissionAction("settings.view");
  return prisma.course.findMany({
    where: { status: { not: "ARCHIVED" } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
