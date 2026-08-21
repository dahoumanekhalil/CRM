"use client";

import * as React from "react";
import Link from "next/link";
import { isPast, isToday, parseISO } from "date-fns";
import {
  Clock,
  Contact,
  Loader2,
  Mail,
  Phone,
  Search,
  Star,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/primitives/empty-state";
import { StatusBadge } from "@/components/primitives/status-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  assignLeadToSession,
  unassignLeadFromSession,
  searchLeadsForAssignment,
} from "./actions";
import type { SessionLeadRow, LeadPickerItem } from "./actions";

// ─── Status colours (same as leads-table) ────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  NEW:            "bg-slate-400",
  CONTACTED:      "bg-blue-500",
  INTERESTED:     "bg-violet-500",
  FOLLOW_UP:      "bg-amber-500",
  CONFIRMED:      "bg-purple-500",
  REGISTERED:     "bg-green-500",
  LOST:           "bg-red-500",
  NOT_INTERESTED: "bg-rose-400",
  UNREACHABLE:    "bg-orange-400",
};

function dot(status: string) {
  return STATUS_DOT[status] ?? "bg-slate-400";
}

function fullName(first: string, last: string | null | undefined) {
  return [first, last].filter(Boolean).join(" ") || "—";
}

// ─── Assigned lead row ────────────────────────────────────────────────────────

function AssignedLeadRow({
  lead,
  sessionId,
}: {
  lead: SessionLeadRow;
  sessionId: string;
}) {
  const [pending, startTransition] = React.useTransition();
  const due = lead.nextActionDue ? parseISO(lead.nextActionDue.toString()) : null;
  const isOverdue = due && isPast(due) && !isToday(due);
  const isDueToday = due && isToday(due);

  return (
    <li className="grid items-center gap-3 px-4 py-3 sm:grid-cols-[auto_1fr_auto]">
      {/* Avatar */}
      <div className="relative shrink-0">
        <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {lead.firstName[0]?.toUpperCase()}{lead.lastName?.[0]?.toUpperCase()}
        </span>
        <span className={cn("absolute -bottom-0.5 -end-0.5 size-2.5 rounded-full border-2 border-background", dot(lead.status))} />
        {lead.isHighPriority && (
          <Star className="absolute -top-1 -end-1 size-3 fill-amber-400 text-amber-400" />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/leads/${lead.id}`}
            className="truncate text-sm font-medium hover:underline"
          >
            {fullName(lead.firstName, lead.lastName)}
          </Link>
          <StatusBadge status={lead.status} />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1 hover:text-foreground">
              <Phone className="size-3" /> {lead.phone}
            </a>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1 hover:text-foreground">
              <Mail className="size-3" /> <span className="truncate max-w-[160px]">{lead.email}</span>
            </a>
          )}
          {lead.nextAction && (
            <span className={cn(
              "inline-flex items-center gap-1",
              isOverdue ? "text-destructive" : isDueToday ? "text-amber-600 dark:text-amber-400" : ""
            )}>
              <Clock className="size-3 shrink-0" /> {lead.nextAction}
            </span>
          )}
        </div>
      </div>

      {/* Unassign */}
      <button
        title="Remove from this session"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              await unassignLeadFromSession(lead.id, sessionId);
              toast.success(`${fullName(lead.firstName, lead.lastName)} removed from this session`);
            } catch {
              toast.error("Failed to remove lead");
            }
          })
        }
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <UserMinus className="size-3.5" />}
      </button>
    </li>
  );
}

// ─── Assign dialog ────────────────────────────────────────────────────────────

function AssignLeadDialog({
  sessionId,
  open,
  onOpenChange,
}: {
  sessionId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<LeadPickerItem[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [assigning, setAssigning] = React.useState<string | null>(null);

  // Debounced search
  React.useEffect(() => {
    const id = setTimeout(async () => {
      setSearching(true);
      try {
        const rows = await searchLeadsForAssignment(query);
        setResults(rows);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  // Load initial results when dialog opens
  React.useEffect(() => {
    if (open) {
      setQuery("");
      searchLeadsForAssignment("").then(setResults);
    }
  }, [open]);

  async function handleAssign(lead: LeadPickerItem) {
    setAssigning(lead.id);
    try {
      await assignLeadToSession(lead.id, sessionId);
      toast.success(`${fullName(lead.firstName, lead.lastName)} assigned to this session`);
      // Remove from results immediately
      setResults((prev) => prev.filter((r) => r.id !== lead.id));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to assign lead");
    } finally {
      setAssigning(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign lead to this session</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email or phone…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="ps-9"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-72 overflow-y-auto rounded-lg border border-border/60">
            {searching ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <Loader2 className="me-2 size-4 animate-spin" /> Searching…
              </div>
            ) : results.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {query ? "No unassigned leads match your search." : "All leads are already assigned to a session."}
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {results.map((lead) => (
                  <li key={lead.id} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {lead.firstName[0]?.toUpperCase()}{lead.lastName?.[0]?.toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium">
                          {fullName(lead.firstName, lead.lastName)}
                        </span>
                        <StatusBadge status={lead.status} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {lead.phone && <span>{lead.phone}</span>}
                        {lead.email && <span className="truncate max-w-[160px]">{lead.email}</span>}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      disabled={assigning === lead.id}
                      onClick={() => handleAssign(lead)}
                    >
                      {assigning === lead.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <UserPlus className="size-3.5" />
                      )}
                      Assign
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Only leads not yet assigned to any session are shown.{" "}
            <Link href="/leads" className="underline hover:text-foreground">
              View all leads →
            </Link>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function SessionLeadsClient({
  leads,
  sessionId,
}: {
  leads: SessionLeadRow[];
  sessionId: string;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{leads.length}</span>{" "}
          {leads.length === 1 ? "lead" : "leads"} assigned to this session
        </p>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <UserPlus className="size-3.5" />
          Assign lead
        </Button>
      </div>

      {/* List */}
      {leads.length === 0 ? (
        <EmptyState
          icon={Contact}
          title="No leads assigned yet"
          description="Assign leads to this session so your sales team knows who to follow up with for this specific group."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <UserPlus className="size-3.5" />
              Assign first lead
            </Button>
          }
          className="border-dashed"
        />
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card">
          {leads.map((lead) => (
            <AssignedLeadRow key={lead.id} lead={lead} sessionId={sessionId} />
          ))}
        </ul>
      )}

      <AssignLeadDialog
        sessionId={sessionId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
