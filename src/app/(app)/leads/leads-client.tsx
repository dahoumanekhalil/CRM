"use client";

import * as React from "react";
import { parseAsString, useQueryState } from "nuqs";
import { LeadsToolbar } from "./leads-toolbar";
import { LeadsTable } from "./leads-table";
import { LeadsCards } from "./leads-cards";
import { LeadsBoard } from "./leads-board";
import { NewLeadSheet } from "./new-lead-sheet";
import { BulkActionBar } from "./bulk-action-bar";
import { LeadDetailsDrawer } from "@/components/shared/lead-details-drawer";
import { useLocalStorage } from "@/lib/use-local-storage";
import { LEADS_DEFAULT_COLUMN_VISIBILITY, LEADS_VIEWS_STORAGE_KEY, LEADS_COLUMNS_STORAGE_KEY } from "./leads-view-constants";
import { LEADS_VIEWS, type LeadsView } from "./view-switcher";
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
  const selectedLeads = rows.filter((r) => rowSelection[r.id]);

  const [drawerLead, setDrawerLead] = React.useState<LeadRow | null>(null);

  // Persisted view + column visibility. Both are hydrated from localStorage on
  // first client render — the initial SSR paint uses the defaults, so nothing
  // depending on them can be rendered above the fold without a hydration hop.
  const [view, setView] = useLocalStorage<LeadsView>(
    LEADS_VIEWS_STORAGE_KEY,
    "table",
    (raw) => {
      const parsed = JSON.parse(raw);
      return LEADS_VIEWS.includes(parsed) ? parsed : "table";
    },
  );
  const [columnVisibility, setColumnVisibility] = useLocalStorage<Record<string, boolean>>(
    LEADS_COLUMNS_STORAGE_KEY,
    LEADS_DEFAULT_COLUMN_VISIBILITY,
  );

  const setColumnVisible = React.useCallback(
    (id: string, visible: boolean) => {
      setColumnVisibility((prev) => ({ ...prev, [id]: visible }));
    },
    [setColumnVisibility],
  );
  const resetColumns = React.useCallback(() => {
    setColumnVisibility(LEADS_DEFAULT_COLUMN_VISIBILITY);
  }, [setColumnVisibility]);

  return (
    <>
      <LeadsToolbar
        total={total}
        onNewLead={() => setSheetOpen(true)}
        courses={courses}
        hideOwnershipFilter={hideOwnershipFilter}
        view={view}
        onViewChange={setView}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisible}
        onResetColumns={resetColumns}
      />
      {selectedIds.length > 0 ? (
        <BulkActionBar
          selectedIds={selectedIds}
          selectedLeads={selectedLeads}
          onClear={() => setRowSelection({})}
          salesTeam={canAssign ? salesTeam : []}
          canAssign={canAssign}
        />
      ) : null}
      {view === "table" ? (
        <LeadsTable
          rows={rows}
          total={total}
          onNewLead={() => setSheetOpen(true)}
          onQuickView={(row) => setDrawerLead(row)}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={(updater) => {
            setColumnVisibility((prev) =>
              typeof updater === "function" ? updater(prev) : updater,
            );
          }}
        />
      ) : view === "cards" ? (
        <LeadsCards
          rows={rows}
          total={total}
          onNewLead={() => setSheetOpen(true)}
          onQuickView={(row) => setDrawerLead(row)}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
        />
      ) : (
        <LeadsBoard
          rows={rows}
          total={total}
          onNewLead={() => setSheetOpen(true)}
          onQuickView={(row) => setDrawerLead(row)}
        />
      )}
      <NewLeadSheet open={sheetOpen} onOpenChange={setSheetOpen} />
      <LeadDetailsDrawer
        lead={drawerLead}
        open={drawerLead !== null}
        onOpenChange={(o) => { if (!o) setDrawerLead(null); }}
      />
    </>
  );
}
