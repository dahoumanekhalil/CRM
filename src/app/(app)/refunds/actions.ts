"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermissionAction } from "@/lib/auth-guards";
import { recordActivity } from "@/lib/activity";
import { applyRefundAdjustment } from "@/lib/commissions/engine";
import { NotificationService } from "@/lib/notifications/notification-service";
import { NotificationTypes } from "@/lib/notifications/types";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

function serAmt(v: unknown): number {
  const n = Number(String(v));
  return Number.isFinite(n) ? n : 0;
}

const requestSchema = z.object({
  registrationId: z.string().min(1),
  amount: z.number().positive(),
  reason: z.string().min(3).max(500),
});

export type RefundApprovalRow = {
  id: string;
  registrationId: string;
  requestedAmount: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  createdAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  requestedByName: string;
  approvedByName: string | null;
  studentName: string;
  courseName: string;
  sessionTitle: string;
};

export async function requestRefund(
  input: z.infer<typeof requestSchema>
): Promise<Result<{ id: string }>> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const session = await requirePermissionAction("payments.write");
  const d = parsed.data;

  // Check registration exists
  const reg = await prisma.registration.findUnique({
    where: { id: d.registrationId },
    select: {
      id: true,
      salesOwnerId: true,
      student: { select: { firstName: true, lastName: true } },
      session: { select: { course: { select: { name: true } } } },
    },
  });
  if (!reg) return { ok: false, error: "Registration not found" };

  // Check no pending refund already exists
  const existing = await prisma.refundApproval.findFirst({
    where: { registrationId: d.registrationId, status: "PENDING" },
    select: { id: true },
  });
  if (existing) return { ok: false, error: "A refund request is already pending for this registration." };

  const approval = await prisma.refundApproval.create({
    data: {
      registrationId: d.registrationId,
      requestedById: session.user.id,
      requestedAmount: d.amount,
      reason: d.reason,
    },
  });

  void recordActivity({
    type: "refund.requested",
    entity: "RefundApproval",
    entityId: approval.id,
    userId: session.user.id,
    meta: { registrationId: d.registrationId, amount: d.amount },
  });

  // Notify approvers
  const approvers = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "MANAGER", "FINANCE"] } },
    select: { id: true },
  });
  const studentName = `${reg.student.firstName} ${reg.student.lastName ?? ""}`.trim();
  const courseName = reg.session.course.name;

  for (const approver of approvers) {
    NotificationService.send({
      recipientId: approver.id,
      type: NotificationTypes.REFUND_REQUESTED,
      payload: {
        category: "ACTION_REQUIRED",
        title: `طلب استرجاع: ${studentName}`,
        body: `${courseName} — ${d.amount.toLocaleString()} DZD`,
        studentName,
        courseName,
        amount: d.amount.toLocaleString(),
        currency: "DZD",
        reason: d.reason,
      },
      entityType: "RefundApproval",
      entityId: approval.id,
      priority: "HIGH",
    });
  }

  revalidatePath("/refunds");
  return { ok: true, data: { id: approval.id } };
}

export async function approveRefund(
  approvalId: string
): Promise<Result<void>> {
  const session = await requirePermissionAction("refunds.approve");

  const approval = await prisma.refundApproval.findUnique({
    where: { id: approvalId },
    select: {
      id: true,
      status: true,
      registrationId: true,
      requestedAmount: true,
      requestedById: true,
      registration: {
        select: {
          studentId: true,
          salesOwnerId: true,
          payments: {
            where: { status: "COMPLETED", amount: { gt: 0 } },
            select: { id: true, amount: true, currency: true },
          },
        },
      },
    },
  });

  if (!approval) return { ok: false, error: "Refund request not found" };
  if (approval.status !== "PENDING") return { ok: false, error: "This refund request has already been processed" };

  const refundAmount = serAmt(approval.requestedAmount);
  const existingPayments = approval.registration.payments;

  await prisma.$transaction(async (tx) => {
    // Mark approval as approved
    await tx.refundApproval.update({
      where: { id: approvalId },
      data: { status: "APPROVED", approvedById: session.user.id, approvedAt: new Date() },
    });

    // Create negative payment record for the refund
    if (existingPayments.length > 0) {
      await tx.payment.create({
        data: {
          studentId: approval.registration.studentId,
          registrationId: approval.registrationId,
          amount: -refundAmount,
          currency: existingPayments[0]?.currency ?? "DZD",
          method: "OTHER",
          status: "COMPLETED",
          paidAt: new Date(),
          recordedById: session.user.id,
          notes: `Approved refund — request #${approvalId.slice(-8)}`,
        },
      });
    }
  });

  // Apply commission adjustment
  await applyRefundAdjustment(approvalId, session.user.id);

  void recordActivity({
    type: "refund.approved",
    entity: "RefundApproval",
    entityId: approvalId,
    userId: session.user.id,
    meta: { registrationId: approval.registrationId, amount: refundAmount },
  });

  // Notify requester
  NotificationService.send({
    recipientId: approval.requestedById,
    type: NotificationTypes.REFUND_APPROVED,
    payload: {
      category: "INFO",
      title: "تمت الموافقة على طلب الاسترجاع",
      body: `المبلغ: ${refundAmount.toLocaleString()} DZD`,
    },
    entityType: "RefundApproval",
    entityId: approvalId,
    priority: "NORMAL",
  });

  revalidatePath("/refunds");
  revalidatePath("/my-commissions");
  return { ok: true, data: undefined };
}

export async function rejectRefund(
  approvalId: string,
  rejectionReason: string
): Promise<Result<void>> {
  const session = await requirePermissionAction("refunds.approve");

  const approval = await prisma.refundApproval.findUnique({
    where: { id: approvalId },
    select: { id: true, status: true, requestedById: true },
  });

  if (!approval) return { ok: false, error: "Refund request not found" };
  if (approval.status !== "PENDING") return { ok: false, error: "This refund request has already been processed" };

  await prisma.refundApproval.update({
    where: { id: approvalId },
    data: {
      status: "REJECTED",
      approvedById: session.user.id,
      rejectedAt: new Date(),
      rejectionReason: rejectionReason.trim() || null,
    },
  });

  void recordActivity({
    type: "refund.rejected",
    entity: "RefundApproval",
    entityId: approvalId,
    userId: session.user.id,
    meta: { rejectionReason },
  });

  NotificationService.send({
    recipientId: approval.requestedById,
    type: NotificationTypes.REFUND_REJECTED,
    payload: {
      category: "INFO",
      title: "تم رفض طلب الاسترجاع",
      body: rejectionReason || "—",
    },
    entityType: "RefundApproval",
    entityId: approvalId,
    priority: "NORMAL",
  });

  revalidatePath("/refunds");
  return { ok: true, data: undefined };
}

export async function listRefundApprovals(filter?: {
  status?: "PENDING" | "APPROVED" | "REJECTED";
}): Promise<RefundApprovalRow[]> {
  await requirePermissionAction("refunds.approve");

  const rows = await prisma.refundApproval.findMany({
    where: filter?.status ? { status: filter.status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      requestedBy: { select: { name: true, email: true } },
      approvedBy: { select: { name: true } },
      registration: {
        select: {
          student: { select: { firstName: true, lastName: true } },
          session: {
            select: {
              title: true,
              course: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    registrationId: r.registrationId,
    requestedAmount: serAmt(r.requestedAmount),
    reason: r.reason,
    status: r.status as "PENDING" | "APPROVED" | "REJECTED",
    rejectionReason: r.rejectionReason,
    createdAt: r.createdAt.toISOString(),
    approvedAt: r.approvedAt?.toISOString() ?? null,
    rejectedAt: r.rejectedAt?.toISOString() ?? null,
    requestedByName: r.requestedBy.name ?? r.requestedBy.email,
    approvedByName: r.approvedBy?.name ?? null,
    studentName: `${r.registration.student.firstName} ${r.registration.student.lastName ?? ""}`.trim(),
    courseName: r.registration.session.course.name,
    sessionTitle: r.registration.session.title ?? r.registration.session.course.name,
  }));
}
