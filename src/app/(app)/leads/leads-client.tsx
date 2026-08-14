"use client";

import * as React from "react";
import { parseAsString, useQueryState } from "nuqs";
import { LeadsToolbar } from "./leads-toolbar";
import { LeadsTable } from "./leads-table";
import { NewLeadSheet } from "./new-lead-sheet";
import { BulkActionBar } from "./bulk-action-bar";
import type { LeadCoursePickerItem, LeadRow } from "./actions";

// URL param `?new=1` opens the create sheet — the command menu uses this to
// jump straight into "Create lead" from anywhere in the app.
const newParam = parseAsString.withOptions({ clearOnDefault: true }).withDefault("");

export function LeadsClient({
  rows,
  total,
  courses,
}: {
  rows: LeadRow[];
  total: number;
  courses: LeadCoursePickerItem[];
}) {
  const [rawNew, setRawNew] = useQueryState("new", newParam);
  const sheetOpen = rawNew === "1";
  const setSheetOpen = (open: boolean) => {
    void setRawNew(open ? "1" : "", { scroll: false });
  };

  // Row selection is lifted here so BulkActionBar can see the selected IDs
  // without needing to dig into the table's internal state.
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
  const selectedIds = Object.entries(rowSelection)
    .filter(([, v]) => v)
    .map(([id]) => id);

  return (
    <>
      <LeadsToolbar
        total={total}
        onNewLead={() => setSheetOpen(true)}
        courses={courses}
      />
      {selectedIds.length > 0 ? (
        <BulkActionBar
          selectedIds={selectedIds}
          onClear={() => setRowSelection({})}
        />
      ) : null}
      <LeadsTable
        rows={rows}
        total={total}
        onNewLead={() => setSheetOpen(true)}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
      />
      <NewLeadSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}
