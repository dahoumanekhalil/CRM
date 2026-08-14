"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PaymentSheet } from "@/app/(app)/payments/payment-sheet";

// Wraps the server-rendered payments list with a small client shell that owns
// the "Record payment" button and the sheet. Locked to this student.
export function StudentPaymentsTabClient({
  studentId,
  studentName,
  empty,
  children,
}: {
  studentId: string;
  studentName: string;
  empty?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="space-y-4">
      {!empty ? (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              Payments for {studentName}
            </h2>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus /> Record payment
          </Button>
        </div>
      ) : null}

      {children}

      {empty ? (
        <div className="flex justify-center">
          <Button onClick={() => setOpen(true)}>
            <Plus /> Record payment
          </Button>
        </div>
      ) : null}

      <PaymentSheet
        mode="create"
        open={open}
        onOpenChange={setOpen}
        students={[]}
        lockedStudentId={studentId}
        lockedStudentName={studentName}
      />
    </div>
  );
}
