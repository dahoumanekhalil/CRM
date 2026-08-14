"use client";

import * as React from "react";
import { parseAsString, useQueryState } from "nuqs";
import { InstructorsToolbar } from "./instructors-toolbar";
import { InstructorsTable } from "./instructors-table";
import { InstructorSheet } from "./instructor-sheet";
import type { InstructorRow } from "./actions";

const newParam = parseAsString
  .withOptions({ clearOnDefault: true })
  .withDefault("");

export function InstructorsClient({
  rows,
  total,
}: {
  rows: InstructorRow[];
  total: number;
}) {
  const [rawNew, setRawNew] = useQueryState("new", newParam);
  const [editRow, setEditRow] = React.useState<InstructorRow | null>(null);

  const newOpen = rawNew === "1";
  const setNewOpen = (open: boolean) => {
    void setRawNew(open ? "1" : "", { scroll: false });
  };

  return (
    <>
      <InstructorsToolbar total={total} onNewInstructor={() => setNewOpen(true)} />
      <InstructorsTable
        rows={rows}
        total={total}
        onEdit={(row) => setEditRow(row)}
        onNewInstructor={() => setNewOpen(true)}
      />
      <InstructorSheet mode="create" open={newOpen} onOpenChange={setNewOpen} />
      {editRow ? (
        <InstructorSheet
          mode="edit"
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditRow(null);
          }}
          instructor={editRow}
        />
      ) : null}
    </>
  );
}
