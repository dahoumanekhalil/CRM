"use client";

import * as React from "react";
import { parseAsString, useQueryState } from "nuqs";
import { CampaignsToolbar } from "./campaigns-toolbar";
import { CampaignsTable } from "./campaigns-table";
import { CampaignSheet } from "./campaign-sheet";
import type { CampaignRow } from "./actions";

const newParam = parseAsString.withOptions({ clearOnDefault: true }).withDefault("");

export function CampaignsClient({
  rows,
  total,
}: {
  rows: CampaignRow[];
  total: number;
}) {
  const [rawNew, setRawNew] = useQueryState("new", newParam);
  const newOpen = rawNew === "1";
  const setNewOpen = (open: boolean) => {
    void setRawNew(open ? "1" : "", { scroll: false });
  };
  const [editing, setEditing] = React.useState<CampaignRow | null>(null);

  return (
    <>
      <CampaignsToolbar total={total} onNewCampaign={() => setNewOpen(true)} />
      <CampaignsTable
        rows={rows}
        total={total}
        onNewCampaign={() => setNewOpen(true)}
        onEditCampaign={setEditing}
      />
      <CampaignSheet mode="create" open={newOpen} onOpenChange={setNewOpen} />
      {editing ? (
        <CampaignSheet
          mode="edit"
          open={!!editing}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          campaign={editing}
        />
      ) : null}
    </>
  );
}
