"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";

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
import type { SalesTeamMember } from "./actions";

const humanize = (s: string) =>
  s
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

// Statuses shown as quick-action chips in the bulk bar.
// REGISTERED and LOST are intentional terminal states (kept but less prominent).
const QUICK_STATUSES: Array<{
  status: LeadStatus;
  label: string;
  className: string;
}> = [
  {
    status: "CONTACTED",
    label: "Mark contacted",
    className:
      "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20",
  },
  {
    status: "INTERESTED",
    label: "Mark interested",
    className:
      "bg-success/10 text-success hover:bg-success/20 border-success/20",
  },
  {
    status: "FOLLOW_UP",
    label: "Follow up",
    className:
      "bg-warning/10 text-warning hover:bg-warning/20 border-warning/20",
  },
  {
    status: "LOST",
    label: "Mark lost",
    className:
      "bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20",
  },
];

export function BulkActionBar({
  selectedIds,
  onClear,
  salesTeam = [],
  canAssign = false,
}: {
  selectedIds: string[];
  onClear: () => void;
  salesTeam?: SalesTeamMember[];
  canAssign?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [pendingStatus, setPendingStatus] = React.useState<LeadStatus | null>(null);
  const [assignPending, setAssignPending] = React.useState(false);
  const count = selectedIds.length;

  if (count === 0) return null;

  const handleBulkAssign = (assigneeId: string) => {
    setAssignPending(true);
    startTransition(async () => {
      const res = await bulkAssignLeads(selectedIds, assigneeId);
      setAssignPending(false);
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
  };

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

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
      <span className="text-sm font-medium text-primary">
        {count} {count === 1 ? "lead" : "leads"} selected
      </span>
      <div className="h-4 w-px bg-border/60" aria-hidden />
      {canAssign && salesTeam.length > 0 ? (
        <Select onValueChange={handleBulkAssign} disabled={pending || assignPending}>
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
