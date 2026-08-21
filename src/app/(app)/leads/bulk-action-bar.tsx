"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/lib/schemas/lead";
import { bulkUpdateLeadStatus, bulkAssignLeads } from "./actions";
import type { SalesTeamMember, LeadRow } from "./actions";

const humanize = (s: string) =>
  s
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

// Statuses shown as quick-action chips in the bulk bar.
const QUICK_STATUSES: Array<{
  status: LeadStatus;
  label: string;
  className: string;
}> = [
  {
    status: "CONTACTED",
    label: "Mark contacted",
    className: "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20",
  },
  {
    status: "INTERESTED",
    label: "Mark interested",
    className: "bg-success/10 text-success hover:bg-success/20 border-success/20",
  },
  {
    status: "CONFIRMED",
    label: "Mark confirmed",
    className: "bg-success/10 text-success hover:bg-success/20 border-success/20",
  },
  {
    status: "NOT_INTERESTED",
    label: "Not interested",
    className: "bg-muted text-muted-foreground hover:bg-muted/80 border-border",
  },
  {
    status: "LOST",
    label: "Mark lost",
    className: "bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20",
  },
];

type ConflictState = {
  assigneeId: string;
  /** Grouped by current owner: ownerId → { name, count } */
  byOwner: Map<string, { name: string; count: number }>;
  unassignedCount: number;
};

export function BulkActionBar({
  selectedIds,
  selectedLeads = [],
  onClear,
  salesTeam = [],
  canAssign = false,
}: {
  selectedIds: string[];
  selectedLeads?: LeadRow[];
  onClear: () => void;
  salesTeam?: SalesTeamMember[];
  canAssign?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [pendingStatus, setPendingStatus] = React.useState<LeadStatus | null>(null);
  const [assignPending, setAssignPending] = React.useState(false);
  const [conflict, setConflict] = React.useState<ConflictState | null>(null);

  const count = selectedIds.length;
  if (count === 0) return null;

  function runAssign(ids: string[], assigneeId: string) {
    setAssignPending(true);
    startTransition(async () => {
      const res = await bulkAssignLeads(ids, assigneeId);
      setAssignPending(false);
      setConflict(null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const name = salesTeam.find((u) => u.id === assigneeId)?.name ?? "rep";
      toast.success(
        `${res.data.assigned} ${res.data.assigned === 1 ? "lead" : "leads"} assigned to ${name}`
      );
      onClear();
      router.refresh();
    });
  }

  function handleRepSelect(assigneeId: string) {
    // Check for leads already assigned to a DIFFERENT rep
    const byOwner = new Map<string, { name: string; count: number }>();
    let unassignedCount = 0;

    for (const lead of selectedLeads) {
      if (!lead.ownerId) {
        unassignedCount++;
      } else if (lead.ownerId !== assigneeId) {
        const ownerName = lead.owner?.name ?? lead.owner?.email ?? "another rep";
        const existing = byOwner.get(lead.ownerId) ?? { name: ownerName, count: 0 };
        byOwner.set(lead.ownerId, { ...existing, count: existing.count + 1 });
      }
    }

    if (byOwner.size > 0) {
      setConflict({ assigneeId, byOwner, unassignedCount });
    } else {
      runAssign(selectedIds, assigneeId);
    }
  }

  const applyStatus = (status: LeadStatus) => {
    setPendingStatus(status);
    startTransition(async () => {
      const res = await bulkUpdateLeadStatus(selectedIds, status);
      setPendingStatus(null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `${res.data.count} ${res.data.count === 1 ? "lead" : "leads"} marked as ${humanize(status).toLowerCase()}`
      );
      onClear();
      router.refresh();
    });
  };

  // ── Conflict resolution panel ──────────────────────────────────────────────

  if (conflict) {
    const ownerList = Array.from(conflict.byOwner.values());
    const conflictTotal = ownerList.reduce((s, o) => s + o.count, 0);
    const assigneeName = salesTeam.find((u) => u.id === conflict.assigneeId)?.name ?? "the selected rep";
    const conflictSummary = ownerList
      .map((o) => `${o.count} from ${o.name}`)
      .join(", ");

    const reassignAllIds = selectedIds;
    const reassignOnlyUnassigned = selectedLeads
      .filter((l) => !l.ownerId)
      .map((l) => l.id);

    return (
      <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 space-y-2">
        <div className="flex items-start gap-2 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <span>
            <span className="font-medium">{conflictTotal} lead{conflictTotal !== 1 ? "s" : ""}</span>
            {" "}({conflictSummary}) are currently assigned to another rep. Reassign to <span className="font-medium">{assigneeName}</span>?
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2.5 text-xs"
            onClick={() => setConflict(null)}
            disabled={assignPending}
          >
            Cancel
          </Button>
          {conflict.unassignedCount > 0 && reassignOnlyUnassigned.length > 0 ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs"
              onClick={() => runAssign(reassignOnlyUnassigned, conflict.assigneeId)}
              disabled={assignPending}
            >
              {assignPending ? <Loader2 className="size-3 animate-spin" /> : null}
              Assign only unassigned ({conflict.unassignedCount})
            </Button>
          ) : null}
          <Button
            size="sm"
            className="h-7 px-2.5 text-xs"
            onClick={() => runAssign(reassignAllIds, conflict.assigneeId)}
            disabled={assignPending}
          >
            {assignPending ? <Loader2 className="size-3 animate-spin" /> : null}
            Reassign all ({count})
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
      <span className="text-sm font-medium text-primary">
        {count} {count === 1 ? "lead" : "leads"} selected
      </span>
      <div className="h-4 w-px bg-border/60" aria-hidden />
      {canAssign && salesTeam.length > 0 ? (
        <Select onValueChange={handleRepSelect} disabled={pending || assignPending}>
          <SelectTrigger className="h-7 w-auto gap-1.5 border-dashed px-2.5 text-xs font-medium">
            <SelectValue placeholder="Assign to…" />
          </SelectTrigger>
          <SelectContent>
            {salesTeam.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name ?? u.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      {QUICK_STATUSES.map(({ status, label, className }) => (
        <button
          key={status}
          type="button"
          onClick={() => applyStatus(status)}
          disabled={pending}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
            className
          )}
        >
          {pending && pendingStatus === status ? (
            <Loader2 className="size-3 animate-spin" />
          ) : null}
          {label}
        </button>
      ))}
      <div className="ms-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={pending}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" /> Clear selection
        </Button>
      </div>
    </div>
  );
}
