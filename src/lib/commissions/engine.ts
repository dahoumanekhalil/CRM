import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { NotificationService } from "@/lib/notifications/notification-service";
import { NotificationTypes } from "@/lib/notifications/types";
import type { CommissionEligibility, RuleSnapshot } from "./types";
import { serializeDecimal } from "./types";

// ── Rule resolution ───────────────────────────────────────────────────────────

async function resolveActiveRule(courseId: string | null) {
  // Course-specific rule takes priority over org-level default
  if (courseId) {
    const courseRule = await prisma.commissionRule.findFirst({
      where: { isActive: true, courseId },
      orderBy: { effectiveFrom: "desc" },
    });
    if (courseRule) return courseRule;
  }
  return prisma.commissionRule.findFirst({
    where: { isActive: true, courseId: null },
    orderBy: { effectiveFrom: "desc" },
  });
}

// ── Payment helpers ───────────────────────────────────────────────────────────

async function computeTotalPaid(registrationId: string): Promise<number> {
  const result = await prisma.payment.aggregate({
    where: {
      registrationId,
      status: "COMPLETED",
    },
    _sum: { amount: true },
  });
  return serializeDecimal(result._sum.amount);
}

// ── Attendance helpers ────────────────────────────────────────────────────────

async function hasPresent(registrationId: string): Promise<boolean> {
  const record = await prisma.attendance.findFirst({
    where: { registrationId, status: "PRESENT" },
    select: { id: true },
  });
  return record !== null;
}

// ── Outstanding balance ───────────────────────────────────────────────────────

export async function getAgentOutstandingBalance(agentId: string): Promise<number> {
  const result = await prisma.commissionLedgerEntry.aggregate({
    where: { agentId },
    _sum: { amount: true },
  });
  return serializeDecimal(result._sum.amount);
}

// ── Core evaluation ───────────────────────────────────────────────────────────

/**
 * Determine commission eligibility for a registration.
 * Pure computation — does not write to the database.
 */
async function computeEligibility(
  registrationId: string
): Promise<CommissionEligibility> {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: {
      id: true,
      salesOwnerId: true,
      agreedPrice: true,
      status: true,
      session: {
        select: {
          id: true,
          status: true,
          endDate: true,
          courseId: true,
        },
      },
    },
  });

  if (!registration) {
    return {
      eligible: false,
      scenario: null,
      reason: "Registration not found",
      agentId: null,
      fixedAmount: 0,
      currency: "DZD",
      ruleId: null,
      ruleSnapshot: null,
    };
  }

  // No agent → no commission
  if (!registration.salesOwnerId) {
    return {
      eligible: false,
      scenario: null,
      reason: "No sales agent assigned",
      agentId: null,
      fixedAmount: 0,
      currency: "DZD",
      ruleId: null,
      ruleSnapshot: null,
    };
  }

  const rule = await resolveActiveRule(registration.session.courseId);
  const fixedAmount = rule ? serializeDecimal(rule.fixedAmount) : 0;
  const currency = rule?.currency ?? "DZD";
  const ruleSnapshot: RuleSnapshot | null = rule
    ? {
        name: rule.name,
        fixedAmount: serializeDecimal(rule.fixedAmount),
        currency: rule.currency,
        refundRetentionPercent: serializeDecimal(rule.refundRetentionPercent),
      }
    : null;

  const agreedPrice = serializeDecimal(registration.agreedPrice);
  const totalPaid = await computeTotalPaid(registrationId);
  const attended = await hasPresent(registrationId);

  const sessionEnded =
    registration.session.status === "COMPLETED" ||
    registration.session.status === "CANCELLED" ||
    new Date(registration.session.endDate) < new Date();

  // Scenario 1 / NO_COMMISSION: no payment AND no attendance (session may or may not have ended)
  if (totalPaid <= 0 && !attended) {
    return {
      eligible: false,
      scenario: 1,
      reason: "No payment and no attendance",
      agentId: registration.salesOwnerId,
      fixedAmount,
      currency,
      ruleId: rule?.id ?? null,
      ruleSnapshot,
    };
  }

  // Session still in progress: return PENDING for any intermediate state
  if (!sessionEnded) {
    return {
      eligible: false,
      scenario: null,
      reason: "Session not yet completed",
      agentId: registration.salesOwnerId,
      fixedAmount,
      currency,
      ruleId: rule?.id ?? null,
      ruleSnapshot,
    };
  }

  // Session has ended:

  // Scenario 2: paid but no attendance after session ended → NO_COMMISSION
  if (totalPaid > 0 && !attended) {
    return {
      eligible: false,
      scenario: 2,
      reason: "Payment received but student did not attend",
      agentId: registration.salesOwnerId,
      fixedAmount,
      currency,
      ruleId: rule?.id ?? null,
      ruleSnapshot,
    };
  }

  // Scenarios 3 & 4: attended AND sale complete → EARNED
  if (attended && agreedPrice > 0 && totalPaid >= agreedPrice) {
    return {
      eligible: true,
      scenario: totalPaid === agreedPrice ? 4 : 3,
      reason: "Attended and sale completed",
      agentId: registration.salesOwnerId,
      fixedAmount,
      currency,
      ruleId: rule?.id ?? null,
      ruleSnapshot,
    };
  }

  // Attended but payment not complete yet → PENDING
  if (attended && (totalPaid < agreedPrice || agreedPrice <= 0)) {
    return {
      eligible: false,
      scenario: null,
      reason: "Attended but payment not fully completed",
      agentId: registration.salesOwnerId,
      fixedAmount,
      currency,
      ruleId: rule?.id ?? null,
      ruleSnapshot,
    };
  }

  return {
    eligible: false,
    scenario: null,
    reason: "Undetermined state",
    agentId: registration.salesOwnerId,
    fixedAmount,
    currency,
    ruleId: rule?.id ?? null,
    ruleSnapshot,
  };
}

// ── Main idempotent evaluation entry point ────────────────────────────────────

/**
 * Evaluate (or re-evaluate) the commission for a registration.
 * - Idempotent: safe to call multiple times — uses upsert + state guards.
 * - Never throws — errors are logged and the function returns gracefully.
 * - Must never block payment or attendance recording.
 */
export async function evaluateCommission(
  registrationId: string,
  actorId?: string
): Promise<void> {
  try {
    const eligibility = await computeEligibility(registrationId);

    if (!eligibility.agentId) {
      // No agent — ensure NO_COMMISSION record if one doesn't exist
      await prisma.salesCommission.upsert({
        where: { registrationId },
        update: {},
        create: {
          registrationId,
          agentId: "__none__", // placeholder, filtered out in queries
          ruleSnapshot: {},
          fixedAmount: 0,
          adjustedAmount: 0,
          finalAmount: 0,
          status: "NO_COMMISSION",
          scenario: eligibility.scenario ?? undefined,
          notes: eligibility.reason,
        },
      });
      return;
    }

    const existing = await prisma.salesCommission.findUnique({
      where: { registrationId },
      select: { id: true, status: true },
    });

    // Never re-evaluate a commission that has already been paid or voided
    if (existing?.status === "PAID" || existing?.status === "VOID") {
      return;
    }

    const noCommissionStatuses = ["NO_COMMISSION"] as const;
    const isNoCommission = !eligibility.eligible &&
      (eligibility.scenario === 1 || eligibility.scenario === 2);

    if (isNoCommission) {
      if (!existing) {
        await prisma.salesCommission.create({
          data: {
            registrationId,
            agentId: eligibility.agentId!,
            ruleId: eligibility.ruleId ?? undefined,
            ruleSnapshot: (eligibility.ruleSnapshot ?? {}) as object,
            fixedAmount: 0,
            adjustedAmount: 0,
            finalAmount: 0,
            status: "NO_COMMISSION",
            scenario: eligibility.scenario ?? undefined,
            notes: eligibility.reason,
          },
        });
      } else if (!noCommissionStatuses.includes(existing.status as "NO_COMMISSION")) {
        await prisma.salesCommission.update({
          where: { registrationId },
          data: {
            status: "NO_COMMISSION",
            scenario: eligibility.scenario ?? undefined,
            notes: eligibility.reason,
          },
        });
      }
      return;
    }

    if (!eligibility.eligible) {
      // PENDING state — payment exists or attended but session not finished
      if (!existing) {
        await prisma.salesCommission.create({
          data: {
            registrationId,
            agentId: eligibility.agentId!,
            ruleId: eligibility.ruleId ?? undefined,
            ruleSnapshot: (eligibility.ruleSnapshot ?? {}) as object,
            fixedAmount: eligibility.fixedAmount,
            adjustedAmount: eligibility.fixedAmount,
            finalAmount: eligibility.fixedAmount,
            status: "PENDING",
            notes: eligibility.reason,
          },
        });
      } else if (existing.status !== "PENDING" && existing.status !== "EARNED" && existing.status !== "ADJUSTED") {
        await prisma.salesCommission.update({
          where: { registrationId },
          data: { status: "PENDING", notes: eligibility.reason },
        });
      }
      return;
    }

    // EARNED — create ledger entry + update status in a transaction
    const wasAlreadyEarned = existing?.status === "EARNED" || existing?.status === "ADJUSTED";

    const commission = await prisma.$transaction(async (tx) => {
      let c: { id: string; agentId: string; fixedAmount: Prisma.Decimal; status: string };

      if (!existing) {
        c = await tx.salesCommission.create({
          data: {
            registrationId,
            agentId: eligibility.agentId!,
            ruleId: eligibility.ruleId ?? undefined,
            ruleSnapshot: (eligibility.ruleSnapshot ?? {}) as object,
            fixedAmount: eligibility.fixedAmount,
            adjustedAmount: eligibility.fixedAmount,
            finalAmount: eligibility.fixedAmount,
            status: "EARNED",
            scenario: eligibility.scenario ?? undefined,
            earnedAt: new Date(),
            notes: eligibility.reason,
          },
          select: { id: true, agentId: true, fixedAmount: true, status: true },
        });

        // Create EARNED ledger entry
        await tx.commissionLedgerEntry.create({
          data: {
            commissionId: c.id,
            agentId: c.agentId,
            type: "EARNED",
            amount: eligibility.fixedAmount,
            description: `Commission earned — ${eligibility.reason}`,
            createdById: actorId ?? null,
          },
        });
      } else if (!wasAlreadyEarned) {
        c = await tx.salesCommission.update({
          where: { registrationId },
          data: {
            status: "EARNED",
            scenario: eligibility.scenario ?? undefined,
            earnedAt: new Date(),
            fixedAmount: eligibility.fixedAmount,
            adjustedAmount: eligibility.fixedAmount,
            finalAmount: eligibility.fixedAmount,
            ruleId: eligibility.ruleId ?? undefined,
            ruleSnapshot: (eligibility.ruleSnapshot ?? {}) as object,
            notes: eligibility.reason,
          },
          select: { id: true, agentId: true, fixedAmount: true, status: true },
        });

        // Check no duplicate EARNED entry
        const existingEntry = await tx.commissionLedgerEntry.findFirst({
          where: { commissionId: c.id, type: "EARNED" },
          select: { id: true },
        });
        if (!existingEntry) {
          await tx.commissionLedgerEntry.create({
            data: {
              commissionId: c.id,
              agentId: c.agentId,
              type: "EARNED",
              amount: eligibility.fixedAmount,
              description: `Commission earned — ${eligibility.reason}`,
              createdById: actorId ?? null,
            },
          });
        }
      } else {
        c = (await tx.salesCommission.findUnique({
          where: { registrationId },
          select: { id: true, agentId: true, fixedAmount: true, status: true },
        }))!;
      }

      return c;
    });

    if (!wasAlreadyEarned && commission) {
      // Fire notification to agent (fire-and-forget)
      const balance = await getAgentOutstandingBalance(commission.agentId);
      const regInfo = await prisma.registration.findUnique({
        where: { id: registrationId },
        select: {
          student: { select: { firstName: true, lastName: true } },
          session: { select: { course: { select: { name: true } } } },
        },
      });

      const courseName = regInfo?.session.course.name ?? "Course";
      const studentName = regInfo
        ? `${regInfo.student.firstName} ${regInfo.student.lastName ?? ""}`.trim()
        : "Student";
      const amount = eligibility.fixedAmount.toLocaleString();
      const currency = eligibility.currency;

      NotificationService.send({
        recipientId: commission.agentId,
        type: NotificationTypes.COMMISSION_EARNED,
        payload: {
          category: "SUCCESS",
          title: `عمولة جديدة: ${amount} ${currency}`,
          body: `الدورة: ${courseName} | الطالب: ${studentName}`,
          amount,
          currency,
          courseName,
          studentName,
          outstanding: balance.toLocaleString(),
        },
        entityType: "SalesCommission",
        entityId: commission.id,
        priority: "NORMAL",
      });

      void recordActivity({
        type: "commission.earned",
        entity: "SalesCommission",
        entityId: commission.id,
        userId: actorId ?? null,
        meta: {
          registrationId,
          agentId: commission.agentId,
          amount: eligibility.fixedAmount,
          currency,
          scenario: eligibility.scenario,
        },
      });
    }
  } catch (err) {
    console.error("[CommissionEngine] evaluateCommission failed:", registrationId, err);
  }
}

// ── Refund adjustment ─────────────────────────────────────────────────────────

/**
 * Apply a refund commission adjustment when a RefundApproval is approved.
 * Creates a REFUND_ADJUSTMENT ledger entry and updates the commission status to ADJUSTED.
 * Idempotent: checks for existing adjustment entry first.
 */
export async function applyRefundAdjustment(
  refundApprovalId: string,
  actorId: string
): Promise<void> {
  try {
    const approval = await prisma.refundApproval.findUnique({
      where: { id: refundApprovalId },
      select: {
        id: true,
        registrationId: true,
        requestedAmount: true,
        status: true,
      },
    });

    if (!approval || approval.status !== "APPROVED") return;

    const commission = await prisma.salesCommission.findUnique({
      where: { registrationId: approval.registrationId },
      select: {
        id: true,
        agentId: true,
        fixedAmount: true,
        adjustedAmount: true,
        finalAmount: true,
        status: true,
        ruleSnapshot: true,
      },
    });

    if (!commission) return;
    if (commission.status === "NO_COMMISSION" || commission.status === "VOID") return;

    // Check idempotency — don't create duplicate adjustment
    const existingAdjustment = await prisma.commissionLedgerEntry.findFirst({
      where: {
        commissionId: commission.id,
        type: "REFUND_ADJUSTMENT",
        referenceId: refundApprovalId,
      },
      select: { id: true },
    });
    if (existingAdjustment) return;

    // Compute adjustment: original commission × (1 - retentionPercent/100)
    const snapshot = commission.ruleSnapshot as {
      refundRetentionPercent?: number;
      fixedAmount?: number;
    };
    const retentionPct = snapshot?.refundRetentionPercent ?? 0;
    const originalAmount = serializeDecimal(commission.fixedAmount);
    const retainedAmount = (originalAmount * retentionPct) / 100;
    const adjustmentAmount = originalAmount - retainedAmount; // amount to deduct

    await prisma.$transaction(async (tx) => {
      const newAdjustedAmount = retainedAmount;

      await tx.salesCommission.update({
        where: { id: commission.id },
        data: {
          adjustedAmount: newAdjustedAmount,
          finalAmount: newAdjustedAmount,
          status: "ADJUSTED",
        },
      });

      await tx.commissionLedgerEntry.create({
        data: {
          commissionId: commission.id,
          agentId: commission.agentId,
          type: "REFUND_ADJUSTMENT",
          amount: -adjustmentAmount,
          description: `Refund adjustment (${retentionPct}% retention)`,
          referenceId: refundApprovalId,
          createdById: actorId,
        },
      });
    });

    const balance = await getAgentOutstandingBalance(commission.agentId);

    const regInfo = await prisma.registration.findUnique({
      where: { id: approval.registrationId },
      select: { session: { select: { course: { select: { name: true } } } } },
    });
    const courseName = regInfo?.session.course.name ?? "Course";

    NotificationService.send({
      recipientId: commission.agentId,
      type: NotificationTypes.COMMISSION_ADJUSTED,
      payload: {
        category: "INFO",
        title: `تعديل عمولة: -${adjustmentAmount.toLocaleString()} DZD`,
        body: `${courseName} — استرجاع ${retentionPct}% محتجز`,
        courseName,
        adjustment: adjustmentAmount.toLocaleString(),
        currency: "DZD",
        outstanding: balance.toLocaleString(),
        reason: "Approved refund",
      },
      entityType: "SalesCommission",
      entityId: commission.id,
      priority: "NORMAL",
    });

    void recordActivity({
      type: "commission.adjusted",
      entity: "SalesCommission",
      entityId: commission.id,
      userId: actorId,
      meta: {
        refundApprovalId,
        adjustmentAmount,
        retainedAmount,
        retentionPct,
      },
    });
  } catch (err) {
    console.error("[CommissionEngine] applyRefundAdjustment failed:", refundApprovalId, err);
  }
}
