import type { Decimal } from "@prisma/client/runtime/library";

export type CommissionStatusValue =
  | "PENDING"
  | "EARNED"
  | "ADJUSTED"
  | "PAID"
  | "NO_COMMISSION"
  | "VOID";

export type LedgerEntryTypeValue =
  | "EARNED"
  | "REFUND_ADJUSTMENT"
  | "MANUAL_ADJUSTMENT"
  | "PAYOUT"
  | "REVERSAL"
  | "VOID";

export type PayoutStatusValue = "PENDING" | "PAID" | "CANCELLED";
export type RefundApprovalStatusValue = "PENDING" | "APPROVED" | "REJECTED";

export interface RuleSnapshot {
  name: string;
  fixedAmount: number;
  currency: string;
  refundRetentionPercent: number;
  [key: string]: unknown;
}

export interface CommissionEligibility {
  eligible: boolean;
  scenario: 1 | 2 | 3 | 4 | 5 | null;
  reason: string;
  agentId: string | null;
  fixedAmount: number;
  currency: string;
  ruleId: string | null;
  ruleSnapshot: RuleSnapshot | null;
}

export function serializeDecimal(v: Decimal | null | undefined): number {
  if (v == null) return 0;
  const n = Number(String(v));
  return Number.isFinite(n) ? n : 0;
}
