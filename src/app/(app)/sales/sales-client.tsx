"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  Phone,
  Search,
  Users2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/primitives/status-badge";
import { cn } from "@/lib/utils";
import { bulkAssignLeads } from "@/app/(app)/leads/actions";
import type { SalesTeamMember } from "@/app/(app)/leads/actions";
import type { UnassignedLeadManagerRow, SalesTeamDetailRow, SalesFunnel, SessionSalesRow, SalesWorkspaceKpis } from "./actions";

// ── KPI strip ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "danger" | "warning" | "success" | "neutral";
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p
        className={cn(
          "text-2xl font-bold tabular-nums",
          tone === "danger" && "text-destructive",
          tone === "warning" && "text-warning",
          tone === "success" && "text-success"
        )}
      >
        {value}
      </p>
    </div>
  );
}

// ── Bulk assignment confirmation dialog ───────────────────────────────────────

function BulkAssignDialog({
  open,
  onOpenChange,
  selectedLeads,
  salesTeam,
  onAssigned,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedLeads: UnassignedLeadManagerRow[];
  salesTeam: SalesTeamMember[];
  onAssigned: () => void;
}) {
  const router = useRouter();
  const [assigneeId, setAssigneeId] = React.useState<string>("");
  const [pending, startTransition] = React.useTransition();

  // Group by course for the confirmation breakdown
  const courseBreakdown = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const l of selectedLeads) {
      const key = l.course?.name ?? "No course";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [selectedLeads]);

  function handleAssign() {
    if (!assigneeId) return;
    startTransition(async () => {
      const res = await bulkAssignLeads(
        selectedLeads.map((l) => l.id),
        assigneeId,
      );
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const assignee = salesTeam.find((u) => u.id === assigneeId);
      toast.success(
        `${res.data.assigned} lead${res.data.assigned !== 1 ? "s" : ""} assigned to ${assignee?.name ?? "rep"}`
      );
      onOpenChange(false);
      onAssigned();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign {selectedLeads.length} Lead{selectedLeads.length !== 1 ? "s" : ""}</DialogTitle>
          <DialogDescription>
            Select a sales representative to receive these leads.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Breakdown */}
          {courseBreakdown.length > 0 && (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm space-y-1">
              {courseBreakdown.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground truncate">{name}</span>
                  <span className="font-medium tabular-nums shrink-0">{count}</span>
                </div>
              ))}
            </div>
          )}

          {/* Assignee picker */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Assign to</label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select sales representative…" />
              </SelectTrigger>
              <SelectContent>
                {salesTeam.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name ?? u.email}
                    <span className="ms-1 text-xs text-muted-foreground">
                      ({u.role.toLowerCase()})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!assigneeId || pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Assign {selectedLeads.length} Lead{selectedLeads.length !== 1 ? "s" : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Unassigned leads inbox ────────────────────────────────────────────────────

function LeadRow({
  lead,
  selected,
  onToggle,
}: {
  lead: UnassignedLeadManagerRow;
  selected: boolean;
  onToggle: () => void;
}) {
  const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(" ");
  const age = formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true });

  return (
    <label className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer border-b border-border/40 last:border-0">
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="size-4 rounded border-border accent-primary"
      />
      <div className="min-w-0 flex-1 grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5">
        <span className="font-medium text-sm truncate">{fullName || "Unnamed"}</span>
        <span className="text-xs text-muted-foreground tabular-nums text-end">{age}</span>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          {lead.phone ? (
            <span className="flex items-center gap-0.5">
              <Phone className="size-3" /> {lead.phone}
            </span>
          ) : null}
          {lead.source ? <span>{lead.source}</span> : null}
        </div>
        {lead.course ? (
          <span className="text-xs text-muted-foreground flex items-center gap-0.5 col-span-2">
            <BookOpen className="size-3" /> {lead.course.name}
          </span>
        ) : null}
      </div>
      <StatusBadge status={lead.status} />
    </label>
  );
}

function UnassignedLeadsInbox({
  initialRows,
  initialTotal,
  salesTeam,
}: {
  initialRows: UnassignedLeadManagerRow[];
  initialTotal: number;
  salesTeam: SalesTeamMember[];
}) {
  const [q, setQ] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [assignOpen, setAssignOpen] = React.useState(false);

  const filtered = q.trim()
    ? initialRows.filter((l) => {
        const term = q.toLowerCase();
        return (
          l.firstName.toLowerCase().includes(term) ||
          (l.lastName?.toLowerCase() ?? "").includes(term) ||
          (l.email?.toLowerCase() ?? "").includes(term) ||
          (l.phone?.toLowerCase() ?? "").includes(term) ||
          (l.course?.name.toLowerCase() ?? "").includes(term)
        );
      })
    : initialRows;

  const selectedLeads = filtered.filter((l) => selected.has(l.id));

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((l) => l.id)));
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <header className="border-b border-border/60 px-4 py-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-tight flex items-center gap-2">
          <AlertCircle className="size-4 text-warning" />
          Unassigned Leads
          {initialTotal > 0 ? (
            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">
              {initialTotal}
            </span>
          ) : null}
        </h2>
        {selected.size > 0 ? (
          <Button size="sm" onClick={() => setAssignOpen(true)}>
            Assign {selected.size} Lead{selected.size !== 1 ? "s" : ""}
          </Button>
        ) : null}
      </header>

      {/* Search + select all */}
      <div className="border-b border-border/40 px-4 py-2 flex items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={filtered.length > 0 && selected.size === filtered.length}
            onChange={toggleAll}
            className="size-4 rounded border-border accent-primary"
          />
          {selected.size > 0
            ? `${selected.size} selected`
            : "Select all"}
        </label>
        <div className="relative flex-1 max-w-xs ms-2">
          <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search leads…"
            className="h-7 ps-8 text-xs"
          />
          {q ? (
            <button
              onClick={() => setQ("")}
              className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <CheckCircle2 className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {q ? "No leads match your search." : "All incoming leads have been assigned."}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {filtered.map((lead) => (
            <LeadRow
              key={lead.id}
              lead={lead}
              selected={selected.has(lead.id)}
              onToggle={() => toggle(lead.id)}
            />
          ))}
        </div>
      )}

      <BulkAssignDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        selectedLeads={selectedLeads}
        salesTeam={salesTeam}
        onAssigned={() => setSelected(new Set())}
      />
    </section>
  );
}

// ── Team workload grid ────────────────────────────────────────────────────────

function TeamWorkloadCard({ rep }: { rep: SalesTeamDetailRow }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {(rep.name ?? rep.email)?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{rep.name ?? rep.email}</p>
          <p className="text-xs text-muted-foreground">{rep.role.toLowerCase()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md bg-muted/40 p-2">
          <div className="text-muted-foreground">Assigned</div>
          <div className="font-semibold tabular-nums text-base">{rep.assigned}</div>
        </div>
        <div className={cn("rounded-md p-2", rep.overdue > 0 ? "bg-destructive/10" : "bg-muted/40")}>
          <div className={cn("text-muted-foreground", rep.overdue > 0 && "text-destructive/70")}>Overdue</div>
          <div className={cn("font-semibold tabular-nums text-base", rep.overdue > 0 && "text-destructive")}>
            {rep.overdue}
          </div>
        </div>
        <div className="rounded-md bg-muted/40 p-2">
          <div className="text-muted-foreground">Interested</div>
          <div className="font-semibold tabular-nums text-base">{rep.interested}</div>
        </div>
        <div className="rounded-md bg-muted/40 p-2">
          <div className="text-muted-foreground">Confirmed</div>
          <div className="font-semibold tabular-nums text-base">{rep.confirmed}</div>
        </div>
        <div className="col-span-2 rounded-md bg-success/5 border border-success/20 p-2">
          <div className="text-muted-foreground">Registered</div>
          <div className="font-semibold tabular-nums text-base text-success">{rep.registered}</div>
        </div>
      </div>

      {rep.dueToday > 0 ? (
        <p className="text-xs text-warning font-medium flex items-center gap-1">
          <Clock className="size-3" /> {rep.dueToday} follow-up{rep.dueToday !== 1 ? "s" : ""} due today
        </p>
      ) : null}
    </div>
  );
}

// ── Funnel visualization ──────────────────────────────────────────────────────

function FunnelBar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{count}</span>
      </div>
      <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Session stats table ───────────────────────────────────────────────────────

function SessionRow({ session }: { session: SessionSalesRow }) {
  const fillPct = session.capacity > 0
    ? Math.round((session.registrations / session.capacity) * 100)
    : 0;

  return (
    <tr className="border-b border-border/40 last:border-0">
      <td className="px-4 py-3">
        <div className="text-sm font-medium">{session.courseName}</div>
        {session.title ? (
          <div className="text-xs text-muted-foreground">{session.title}</div>
        ) : null}
        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          <CalendarDays className="size-3" />
          {format(new Date(session.startDate), "d MMM yyyy")}
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="tabular-nums text-sm">{session.interestedLeads}</span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="tabular-nums text-sm">{session.confirmed}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden min-w-[60px]">
            <div
              className={cn(
                "h-full rounded-full",
                fillPct >= 90 ? "bg-destructive" : fillPct >= 70 ? "bg-warning" : "bg-success"
              )}
              style={{ width: `${fillPct}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
            {session.registrations}/{session.capacity}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={session.status} />
      </td>
    </tr>
  );
}

// ── Main client component ─────────────────────────────────────────────────────

export function SalesManagerClient({
  kpis,
  unassignedRows,
  unassignedTotal,
  teamRows,
  funnel,
  sessionStats,
  salesTeam,
}: {
  kpis: SalesWorkspaceKpis;
  unassignedRows: UnassignedLeadManagerRow[];
  unassignedTotal: number;
  teamRows: SalesTeamDetailRow[];
  funnel: SalesFunnel;
  sessionStats: SessionSalesRow[];
  salesTeam: SalesTeamMember[];
}) {
  const maxFunnelCount = funnel.stages[0]?.count ?? 1;

  return (
    <div className="space-y-8">
      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <KpiCard label="Total Leads" value={kpis.totalLeads} />
        <KpiCard label="Unassigned" value={kpis.unassigned} tone={kpis.unassigned > 0 ? "warning" : "neutral"} />
        <KpiCard label="Assigned" value={kpis.assigned} />
        <KpiCard label="Follow-ups Today" value={kpis.followUpsToday} />
        <KpiCard label="Overdue" value={kpis.overdueFollowUps} tone={kpis.overdueFollowUps > 0 ? "danger" : "neutral"} />
        <KpiCard label="Confirmed" value={kpis.confirmed} tone="success" />
        <KpiCard label="Registered" value={kpis.registered} tone="success" />
      </div>

      {/* Unassigned leads inbox + team workload */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <UnassignedLeadsInbox
          initialRows={unassignedRows}
          initialTotal={unassignedTotal}
          salesTeam={salesTeam}
        />

        {/* Team workload */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-tight flex items-center gap-1.5">
            <Users2 className="size-4 text-muted-foreground" />
            Sales Team
          </h2>
          <div className="space-y-3">
            {teamRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales team members found.</p>
            ) : (
              teamRows.map((rep) => <TeamWorkloadCard key={rep.id} rep={rep} />)
            )}
          </div>
        </section>
      </div>

      {/* Funnel + sessions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sales funnel */}
        <section className="rounded-xl border border-border/60 bg-card p-5">
          <h2 className="text-sm font-semibold tracking-tight mb-4">Sales Pipeline</h2>
          <div className="space-y-3">
            {funnel.stages.map((stage) => (
              <FunnelBar
                key={stage.key}
                label={stage.label}
                count={stage.count}
                max={maxFunnelCount}
              />
            ))}
          </div>
          {funnel.total > 0 ? (
            <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Conversion rate</span>
              <span className="font-semibold text-success">{funnel.conversionRate}%</span>
            </div>
          ) : null}
          {(funnel.dropped.lost + funnel.dropped.notInterested + funnel.dropped.unreachable) > 0 ? (
            <div className="mt-2 pt-2 border-t border-border/40 space-y-1">
              {funnel.dropped.lost > 0 ? (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Lost</span><span className="tabular-nums">{funnel.dropped.lost}</span>
                </div>
              ) : null}
              {funnel.dropped.notInterested > 0 ? (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Not interested</span><span className="tabular-nums">{funnel.dropped.notInterested}</span>
                </div>
              ) : null}
              {funnel.dropped.unreachable > 0 ? (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Unreachable</span><span className="tabular-nums">{funnel.dropped.unreachable}</span>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        {/* Upcoming course run capacity */}
        <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <header className="border-b border-border/60 px-4 py-3">
            <h2 className="text-sm font-semibold tracking-tight">Upcoming Course Run Capacity</h2>
          </header>
          {sessionStats.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No upcoming course runs.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/40 text-xs text-muted-foreground">
                    <th className="px-4 py-2 text-start font-medium">Course Run</th>
                    <th className="px-4 py-2 text-center font-medium">Leads</th>
                    <th className="px-4 py-2 text-center font-medium">Confirmed</th>
                    <th className="px-4 py-2 text-start font-medium">Capacity</th>
                    <th className="px-4 py-2 text-start font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionStats.map((s) => <SessionRow key={s.id} session={s} />)}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
