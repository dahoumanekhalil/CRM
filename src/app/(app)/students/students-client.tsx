"use client";

import * as React from "react";
import { parseAsString, useQueryState } from "nuqs";
import { StudentsToolbar } from "./students-toolbar";
import { StudentsTable } from "./students-table";
import { StudentSheet } from "./student-sheet";
import type { StudentRow } from "./actions";

const newParam = parseAsString.withOptions({ clearOnDefault: true }).withDefault("");

export function StudentsClient({
  rows,
  total,
}: {
  rows: StudentRow[];
  total: number;
}) {
  const [rawNew, setRawNew] = useQueryState("new", newParam);
  const newOpen = rawNew === "1";
  const setNewOpen = (open: boolean) => {
    void setRawNew(open ? "1" : "", { scroll: false });
  };

  return (
    <>
      <StudentsToolbar total={total} onNewStudent={() => setNewOpen(true)} />
      <StudentsTable
        rows={rows}
        total={total}
        onNewStudent={() => setNewOpen(true)}
      />
      <StudentSheet mode="create" open={newOpen} onOpenChange={setNewOpen} />
    </>
  );
}
