"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryStates } from "nuqs";
import { toast } from "sonner";
import { Clock, Contact, Mail, Phone, Star } from "lucide-react";
import { isPast, isToday, parseISO } from "date-fns";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/use-t";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/primitives/empty-state";
import { DataTablePagination } from "@/components/tables/data-table-pagination";

import { LEADS_BOARD_STATUSES, LEADS_TABLE_PAGE_SIZE_OPTIONS } from "./leads-view-constants";
import { leadFilters } from "./leads-filters";
import { updateLeadStatusDirect, type LeadRow } from "./actions";
import type { VisibleLeadStatus } from "@/lib/schemas/lead";

// ─── Shared style config ──────────────────────────────────────────────────────

const STATUS_LABELS: Record<VisibleLeadStatus, string> = {
  NEW: "New",
  ASSIGNED: "Assigned",
  CONTACTED: "Contacted",
  INTERESTED: "Interested",
  CONFIRMED: "Confirmed",
  REGISTERED: "Registered",
  LOST: "Lost",
  NOT_INTERESTED: "Not interested",
  UNREACHABLE: "Unreachable",
};

const STATUS_ACCENT: Record<VisibleLeadStatus, string> = {
  NEW: "bg-slate-400",
  ASSIGNED: "bg-indigo-500",
  CONTACTED: "bg-blue-500",
  INTERESTED: "bg-violet-500",
  CONFIRMED: "bg-purple-500",
  REGISTERED: "bg-green-500",
  LOST: "bg-red-500",
  NOT_INTERESTED: "bg-rose-500",
  UNREACHABLE: "bg-orange-500",
};

const STATUS_AVATAR: Record<VisibleLeadStatus, string> = {
  NEW: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  ASSIGNED: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300",
  CONTACTED: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  INTERESTED: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
  CONFIRMED: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  REGISTERED: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  LOST: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  NOT_INTERESTED: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",
  UNREACHABLE: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
};

function fullName(row: LeadRow) {
  return [row.firstName, row.lastName].filter(Boolean).join(" ");
}
function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function LeadKanbanCard({
  row,
  isDragging,
  onOpen,
}: {
  row: LeadRow;
  isDragging?: boolean;
  onOpen: (id: string) => void;
}) {
  const name = fullName(row) || "—";
  const status = (row.status as VisibleLeadStatus) ?? "NEW";
  const due = row.nextActionDue ? parseISO(row.nextActionDue.toString()) : null;
  const isOverdue = due && isPast(due) && !isToday(due);
  const isDueToday = due && isToday(due);
  const source = (row as unknown as { source: string | null }).source;
  const owner = (row as unknown as { owner: { name: string | null } | null }).owner;

  return (
    <div
      onClick={() => onOpen(row.id)}
      className={cn(
        "cursor-pointer rounded-md border border-border/70 bg-card p-3 shadow-sm transition-shadow",
        "hover:border-border hover:shadow-md",
        isDragging && "opacity-60 shadow-lg",
      )}
    >
      <div className="flex items-start gap-2 min-w-0">
        <Avatar className="size-7 shrink-0">
          <AvatarFallback className={cn("text-[10px] font-semibold", STATUS_AVATAR[status])}>
            {initials(name || "?")}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <div className="truncate text-sm font-medium">{name}</div>
            {row.isHighPriority ? (
              <Star className="size-3 shrink-0 fill-amber-400 text-amber-400" />
            ) : null}
          </div>
          {source ? (
            <div className="truncate text-[11px] text-muted-foreground">{source}</div>
          ) : null}
        </div>
      </div>

      {row.nextAction ? (
        <div
          className={cn(
            "mt-2 inline-flex items-center gap-1 text-[11px]",
            isOverdue
              ? "text-destructive"
              : isDueToday
              ? "text-amber-600 dark:text-amber-400"
              : "text-muted-foreground",
          )}
        >
          <Clock className="size-3 shrink-0" />
          <span className="truncate">{row.nextAction}</span>
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
        {row.phone ? (
          <span className="inline-flex items-center gap-1">
            <Phone className="size-3" />
            <span className="truncate max-w-[110px]">{row.phone}</span>
          </span>
        ) : null}
        {!row.phone && row.email ? (
          <span className="inline-flex items-center gap-1">
            <Mail className="size-3" />
            <span className="truncate max-w-[140px]">{row.email}</span>
          </span>
        ) : null}
        {owner?.name ? (
          <span className="ms-auto truncate max-w-[90px]">{owner.name}</span>
        ) : null}
      </div>
    </div>
  );
}

function DraggableCard({
  row,
  onOpen,
}: {
  row: LeadRow;
  onOpen: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: row.id,
    data: { status: row.status },
  });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      <LeadKanbanCard row={row} isDragging={isDragging} onOpen={onOpen} />
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

function BoardColumn({
  status,
  leads,
  onOpen,
}: {
  status: VisibleLeadStatus;
  leads: LeadRow[];
  onOpen: (id: string) => void;
}) {
  const t = useT();
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` });

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg border border-border/60 bg-muted/30">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className={cn("size-2 rounded-full", STATUS_ACCENT[status])} />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t(STATUS_LABELS[status])}
          </span>
        </div>
        <span className="text-[11px] tabular-nums text-muted-foreground">{leads.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-[120px] space-y-2 p-2 transition-colors",
          isOver && "bg-primary/5",
        )}
      >
        {leads.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-border/50 text-[11px] text-muted-foreground">
            {t("Drop leads here")}
          </div>
        ) : (
          leads.map((row) => <DraggableCard key={row.id} row={row} onOpen={onOpen} />)
        )}
      </div>
    </div>
  );
}

// ─── Board ────────────────────────────────────────────────────────────────────

export function LeadsBoard({
  rows,
  total,
  onNewLead,
  onQuickView,
}: {
  rows: LeadRow[];
  total: number;
  onNewLead: () => void;
  onQuickView?: (row: LeadRow) => void;
}) {
  const t = useT();
  const router = useRouter();
  const [filters, setFilters] = useQueryStates(leadFilters);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  // Optimistic move: keep a local override map keyed by lead id → new status.
  // Cleared once the router refresh brings in the persisted state.
  const [pendingStatus, setPendingStatus] = React.useState<Record<string, VisibleLeadStatus>>({});

  const effectiveRows = React.useMemo(
    () =>
      rows.map((r) =>
        pendingStatus[r.id] ? { ...r, status: pendingStatus[r.id] } : r,
      ),
    [rows, pendingStatus],
  );

  const grouped = React.useMemo(() => {
    const g: Record<VisibleLeadStatus, LeadRow[]> = {} as Record<VisibleLeadStatus, LeadRow[]>;
    for (const s of LEADS_BOARD_STATUSES) g[s] = [];
    for (const row of effectiveRows) {
      const s = LEADS_BOARD_STATUSES.includes(row.status as VisibleLeadStatus)
        ? (row.status as VisibleLeadStatus)
        : "INTERESTED"; // fold legacy FOLLOW_UP → INTERESTED
      g[s].push(row);
    }
    return g;
  }, [effectiveRows]);

  const [activeLead, setActiveLead] = React.useState<LeadRow | null>(null);

  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    const lead = effectiveRows.find((r) => r.id === id) ?? null;
    setActiveLead(lead);
  };

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveLead(null);
    if (!e.over) return;
    const overId = String(e.over.id);
    if (!overId.startsWith("col:")) return;
    const target = overId.slice(4) as VisibleLeadStatus;
    const leadId = String(e.active.id);
    const current = effectiveRows.find((r) => r.id === leadId);
    if (!current || current.status === target) return;

    // Optimistic — flip locally, revert if the server refuses.
    setPendingStatus((prev) => ({ ...prev, [leadId]: target }));
    try {
      const res = await updateLeadStatusDirect(leadId, target);
      if (res.ok) {
        toast.success(t("Status updated"));
        router.refresh();
      } else {
        setPendingStatus((prev) => {
          const next = { ...prev };
          delete next[leadId];
          return next;
        });
        toast.error(res.error);
      }
    } catch {
      setPendingStatus((prev) => {
        const next = { ...prev };
        delete next[leadId];
        return next;
      });
      toast.error(t("Couldn't update the lead."));
    }
  };

  const handleOpen = React.useCallback(
    (id: string) => {
      const lead = effectiveRows.find((r) => r.id === id);
      if (lead && onQuickView) onQuickView(lead);
      else router.push(`/leads/${id}`);
    },
    [effectiveRows, onQuickView, router],
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border/70 bg-card">
        {filters.q || filters.status !== "ALL" ? (
          <EmptyState
            icon={Contact}
            title={t("No leads match your filters")}
            description={t("Try clearing filters or searching for something else.")}
            action={
              <Button
                variant="outline"
                onClick={() => setFilters({ q: "", status: "ALL", page: 1 })}
              >
                {t("Clear filters")}
              </Button>
            }
            className="border-0 bg-transparent"
          />
        ) : (
          <EmptyState
            icon={Contact}
            title={t("No leads yet")}
            description={t("Create your first lead to start managing your sales pipeline.")}
            action={<Button onClick={onNewLead}>{t("Add your first lead")}</Button>}
            className="border-0 bg-transparent"
          />
        )}
      </div>
    );
  }

  const isPageSliced = filters.pageSize < total;

  return (
    <div className="space-y-3">
      {isPageSliced ? (
        <div className="flex items-center justify-between rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          <span>
            {t("Showing")} <span className="font-semibold">{effectiveRows.length}</span>{" "}
            {t("of")} <span className="font-semibold">{total}</span>{" "}
            {t("leads. Increase rows per page to see the whole pipeline.")}
          </span>
          <button
            type="button"
            onClick={() =>
              setFilters({
                pageSize: Math.min(
                  500,
                  LEADS_TABLE_PAGE_SIZE_OPTIONS.find((n) => n >= total) ?? 500,
                ),
                page: 1,
              })
            }
            className="ms-3 underline underline-offset-2 hover:no-underline"
          >
            {t("Show all")}
          </button>
        </div>
      ) : null}

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {LEADS_BOARD_STATUSES.map((status) => (
            <BoardColumn
              key={status}
              status={status}
              leads={grouped[status]}
              onOpen={handleOpen}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeLead ? (
            <div className="w-72 pointer-events-none">
              <LeadKanbanCard row={activeLead} isDragging onOpen={() => undefined} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <DataTablePagination
        page={filters.page}
        pageSize={filters.pageSize}
        totalItems={total}
        onPageChange={(p) => setFilters({ page: p })}
        onPageSizeChange={(s) => setFilters({ pageSize: s, page: 1 })}
        pageSizeOptions={LEADS_TABLE_PAGE_SIZE_OPTIONS}
      />
    </div>
  );
}

