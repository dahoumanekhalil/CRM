"use client";

import * as React from "react";
import Link from "next/link";
import { parseAsString, useQueryState, useQueryStates } from "nuqs";
import { format } from "date-fns";
import { Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/primitives/empty-state";
import { PaymentsToolbar } from "./payments-toolbar";
import { PaymentsTable } from "./payments-table";
import { PaymentSheet } from "./payment-sheet";
import { paymentFilters } from "./payments-filters";
import type {
  PaymentRow,
  PaymentStudentPickerItem,
  OutstandingBalanceRow,
} from "./actions";

const newParam = parseAsString.withOptions({ clearOnDefault: true }).withDefault("");

function formatMoney(n: number) {
  return `${n.toLocaleString("fr-DZ")} DA`;
}

function OutstandingBalancesTable({
  rows,
  students,
}: {
  rows: OutstandingBalanceRow[];
  students: PaymentStudentPickerItem[];
}) {
  const [recordFor, setRecordFor] = React.useState<OutstandingBalanceRow | null>(null);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="No outstanding balances"
        description="All registrations are either fully paid or have no agreed price set."
      />
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
        <header className="border-b border-border/60 px-4 py-3">
          <h2 className="text-sm font-semibold tracking-tight">
            Outstanding Balances
          </h2>
          <p className="text-xs text-muted-foreground">
            {rows.length} registration{rows.length !== 1 ? "s" : ""} with unpaid balance
          </p>
        </header>
        <ul className="divide-y divide-border/60">
          {rows.map((r) => {
            const studentName =
              [r.student.firstName, r.student.lastName]
                .filter(Boolean)
                .join(" ") ||
              r.student.email ||
              "Unnamed student";
            return (
              <li
                key={r.registrationId}
                className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/students/${r.student.id}`}
                      className="text-sm font-medium hover:underline truncate"
                    >
                      {studentName}
                    </Link>
                    <span
                      className={
                        r.paymentStatus === "UNPAID"
                          ? "rounded-full bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive"
                          : "rounded-full bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400"
                      }
                    >
                      {r.paymentStatus === "UNPAID" ? "Unpaid" : "Partially paid"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.session.course.name}
                    {r.session.title ? ` · ${r.session.title}` : ""}
                    {r.session.course.name !== r.session.title && r.session.title
                      ? ""
                      : ""}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 text-xs">
                    <span>
                      <span className="text-muted-foreground">Agreed: </span>
                      <span className="font-medium tabular-nums">
                        {formatMoney(r.agreedPrice)}
                      </span>
                    </span>
                    <span>
                      <span className="text-muted-foreground">Paid: </span>
                      <span className="font-medium tabular-nums text-green-700 dark:text-green-400">
                        {formatMoney(r.totalPaid)}
                      </span>
                    </span>
                    <span>
                      <span className="text-muted-foreground">Remaining: </span>
                      <span className="font-semibold tabular-nums text-destructive">
                        {formatMoney(r.remaining)}
                      </span>
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 shrink-0 text-xs"
                  onClick={() => setRecordFor(r)}
                >
                  Record payment
                </Button>
              </li>
            );
          })}
        </ul>
      </div>

      {recordFor ? (
        <PaymentSheet
          mode="create"
          open={!!recordFor}
          onOpenChange={(open) => { if (!open) setRecordFor(null); }}
          students={students}
          lockedStudentId={recordFor.student.id}
          lockedStudentName={
            [recordFor.student.firstName, recordFor.student.lastName]
              .filter(Boolean)
              .join(" ") || recordFor.student.email || "Student"
          }
          presetRegistrationId={recordFor.registrationId}
        />
      ) : null}
    </>
  );
}

export function PaymentsClient({
  rows,
  total,
  students,
  outstandingBalances,
}: {
  rows: PaymentRow[];
  total: number;
  students: PaymentStudentPickerItem[];
  outstandingBalances: OutstandingBalanceRow[];
}) {
  const [rawNew, setRawNew] = useQueryState("new", newParam);
  const [filters] = useQueryStates(paymentFilters);
  const newOpen = rawNew === "1";
  const setNewOpen = (open: boolean) => {
    void setRawNew(open ? "1" : "", { scroll: false });
  };
  const [editing, setEditing] = React.useState<PaymentRow | null>(null);

  const isOutstandingView = filters.status === "OUTSTANDING";

  return (
    <>
      <PaymentsToolbar total={total} onNewPayment={() => setNewOpen(true)} />

      {isOutstandingView ? (
        <OutstandingBalancesTable rows={outstandingBalances} students={students} />
      ) : (
        <PaymentsTable
          rows={rows}
          total={total}
          onNewPayment={() => setNewOpen(true)}
          onEditPayment={setEditing}
        />
      )}

      <PaymentSheet
        mode="create"
        open={newOpen}
        onOpenChange={setNewOpen}
        students={students}
      />
      {editing ? (
        <PaymentSheet
          mode="edit"
          open={!!editing}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          payment={editing}
          students={students}
        />
      ) : null}
    </>
  );
}
