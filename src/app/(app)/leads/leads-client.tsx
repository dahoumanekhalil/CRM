"use client";

import * as React from "react";
import { parseAsString, useQueryState } from "nuqs";
import { LeadsToolbar } from "./leads-toolbar";
import { LeadsTable } from "./leads-table";
import { NewLeadSheet } from "./new-lead-sheet";
import { BulkActionBar } from "./bulk-action-bar";
import { LeadDetailsDrawer } from "@/components/shared/lead-details-drawer";
import type { LeadCoursePickerItem, LeadRow, SalesTeamMember } from "./actions";

// URL param `?new=1` opens the create sheet — the command menu uses this to
// jump straight into "Create lead" from anywhere in the app.
const newParam = parseAsString.withOptions({ clearOnDefault: true }).withDefault("");

export function LeadsClient({
  rows,
  total,
  courses,
  salesTeam = [],
  canAssign = false,
  hideOwnershipFilter = false,
}: {
  rows: LeadRow[];
  total: number;
  courses: LeadCoursePickerItem[];
  salesTeam?: SalesTeamMember[];
  canAssign?: boolean;
  hideOwnershipFilter?: boolean;
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

  const [drawerLead, setDrawerLead] = React.useState<LeadRow | null>(null);

  return (
    <>
      <LeadsToolbar
        total={total}
        onNewLead={() => setSheetOpen(true)}
        courses={courses}
        hideOwnershipFilter={hideOwnershipFilter}
      />
      {selectedIds.length > 0 ? (
        <BulkActionBar
          selectedIds={selectedIds}
          onClear={() => setRowSelection({})}
          salesTeam={canAssign ? salesTeam : []}
          canAssign={canAssign}
        />
      ) : null}
      <LeadsTable
        rows={rows}
        total={total}
        onNewLead={() => setSheetOpen(true)}
        onQuickView={(row) => setDrawerLead(row)}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
      />
      <NewLeadSheet open={sheetOpen} onOpenChange={setSheetOpen} />
      <LeadDetailsDrawer
        lead={drawerLead}
        open={drawerLead !== null}
        onOpenChange={(o) => { if (!o) setDrawerLead(null); }}
      />
    </>
  );
}
