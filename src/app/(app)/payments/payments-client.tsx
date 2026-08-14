"use client";

import * as React from "react";
import { parseAsString, useQueryState } from "nuqs";
import { PaymentsToolbar } from "./payments-toolbar";
import { PaymentsTable } from "./payments-table";
import { PaymentSheet } from "./payment-sheet";
import type { PaymentRow, PaymentStudentPickerItem } from "./actions";

const newParam = parseAsString.withOptions({ clearOnDefault: true }).withDefault("");

export function PaymentsClient({
  rows,
  total,
  students,
}: {
  rows: PaymentRow[];
  total: number;
  students: PaymentStudentPickerItem[];
}) {
  const [rawNew, setRawNew] = useQueryState("new", newParam);
  const newOpen = rawNew === "1";
  const setNewOpen = (open: boolean) => {
    void setRawNew(open ? "1" : "", { scroll: false });
  };
  const [editing, setEditing] = React.useState<PaymentRow | null>(null);

  return (
    <>
      <PaymentsToolbar total={total} onNewPayment={() => setNewOpen(true)} />
      <PaymentsTable
        rows={rows}
        total={total}
        onNewPayment={() => setNewOpen(true)}
        onEditPayment={setEditing}
      />
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
