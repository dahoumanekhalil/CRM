"use client";

import * as React from "react";
import Link from "next/link";
import { useQueryStates } from "nuqs";
import { AlarmClock, Clock, Contact, Eye, Mail, MessageCircle, Phone, Star } from "lucide-react";
import { isPast, isToday, parseISO } from "date-fns";

import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/use-t";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/primitives/empty-state";
import { DataTablePagination } from "@/components/tables/data-table-pagination";
import { calcPaymentStatus } from "@/lib/payment-status";

import { leadFilters } from "./leads-filters";
import { LEADS_TABLE_PAGE_SIZE_OPTIONS } from "./leads-view-constants";
import type { LeadRow } from "./actions";

const STATUS_CONFIG: Record<string, { avatar: string; ring: string; label: string }> = {
  NEW:            { avatar: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",       ring: "",                          label: "New" },
  ASSIGNED:       { avatar: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300", ring: "ring-indigo-400/30",        label: "Assigned" },
  CONTACTED:      { avatar: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",         ring: "ring-blue-400/30",          label: "Contacted" },
  INTERESTED:     { avatar: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300", ring: "ring-violet-400/30",        label: "Interested" },
  FOLLOW_UP:      { avatar: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",     ring: "ring-amber-400/30",         label: "Interested" },
  CONFIRMED:      { avatar: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300", ring: "ring-purple-400/30",        label: "Confirmed" },
  REGISTERED:     { avatar: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",     ring: "ring-green-400/30",         label: "Registered" },
  LOST:           { avatar: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",             ring: "ring-red-400/30",           label: "Lost" },
  NOT_INTERESTED: { avatar: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",         ring: "ring-rose-400/30",          label: "Not interested" },
  UNREACHABLE:    { avatar: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300", ring: "ring-orange-400/30",        label: "Unreachable" },
};

const cfg = (status: string) => STATUS_CONFIG[status] ?? STATUS_CONFIG.NEW;

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

function LeadCard({
  row,
  selected,
  onSelectedChange,
  onQuickView,
}: {
  row: LeadRow;
  selected: boolean;
  onSelectedChange: (v: boolean) => void;
  onQuickView?: (row: LeadRow) => void;
}) {
  const t = useT();
  const name = fullName(row) || "—";
  const s = cfg(row.status);

  const due = row.nextActionDue ? parseISO(row.nextActionDue.toString()) : null;
  const isOverdue = due && isPast(due) && !isToday(due);
  const isDueToday = due && isToday(due);

  const payDot = calcPaymentStatus(
    (row as unknown as { student?: { registrations: Parameters<typeof calcPaymentStatus>[0] } })
      .student?.registrations ?? null,
  );

  const source = (row as unknown as { source: string | null }).source;
  const callTime = (row as unknown as { preferredCallTime: string | null }).preferredCallTime;
  const owner = (row as unknown as { owner: { name: string | null } | null }).owner;
  const course = (row as unknown as { course: { name: string } | null }).course;
  const lastNote = row.communications?.[0]?.body;

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3 rounded-lg border border-border/70 bg-card p-4 transition-colors hover:border-border hover:shadow-sm",
        selected && "border-primary/60 ring-2 ring-primary/20",
      )}
    >
      <div
        className="absolute top-2 end-2 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={selected}
          onCheckedChange={(v) => onSelectedChange(!!v)}
          aria-label={`Select ${name}`}
        />
      </div>

      <Link href={`/leads/${row.id}`} className="flex items-start gap-3 min-w-0">
        <div className="relative shrink-0">
          <Avatar className={cn("size-10 ring-2 ring-transparent", s.ring)}>
            <AvatarFallback className={cn("text-[12px] font-semibold", s.avatar)}>
              {initials(name || "?")}
            </AvatarFallback>
          </Avatar>
          {payDot === "full" && (
            <span
              className="absolute -bottom-0.5 -end-0.5 size-2.5 rounded-full border-2 border-background bg-green-500"
              title="Fully paid"
            />
          )}
          {payDot === "partial" && (
            <span
              className="absolute -bottom-0.5 -end-0.5 size-2.5 rounded-full border-2 border-background bg-orange-500"
              title="Partially paid"
            />
          )}
          {row.isHighPriority ? (
            <Star className="absolute -top-1 -end-1 size-3 fill-amber-400 text-amber-400" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-semibold">{name}</div>
          </div>
          <div className="text-xs text-muted-foreground">{t(s.label)}</div>
        </div>
      </Link>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {row.phone ? (
          <a
            href={`tel:${row.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <Phone className="size-3" />
            <span className="truncate max-w-[150px]">{row.phone}</span>
          </a>
        ) : null}
        {row.email ? (
          <a
            href={`mailto:${row.email}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <Mail className="size-3" />
            <span className="truncate max-w-[180px]">{row.email}</span>
          </a>
        ) : null}
      </div>

      {row.nextAction ? (
        <div
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs",
            isOverdue
              ? "bg-destructive/10 text-destructive"
              : isDueToday
              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Clock className="size-3 shrink-0" />
          <span className="truncate">{row.nextAction}</span>
        </div>
      ) : null}

      {lastNote ? (
        <div className="inline-flex items-start gap-1.5 text-xs text-muted-foreground">
          <MessageCircle className="size-3 mt-0.5 shrink-0" />
          <span className="line-clamp-2">{lastNote}</span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground pt-1 border-t border-border/60 mt-auto">
        {course ? <span className="truncate max-w-[140px]">{course.name}</span> : null}
        {source ? <span className="truncate max-w-[120px]">{source}</span> : null}
        {callTime ? (
          <span className="inline-flex items-center gap-1">
            <AlarmClock className="size-3" />
            {callTime}
          </span>
        ) : null}
        {owner?.name ? (
          <span className="ms-auto inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-primary/60" />
            {owner.name}
          </span>
        ) : null}
        {onQuickView ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onQuickView(row);
            }}
            className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-muted hover:text-foreground"
          >
            <Eye className="size-3" />
            {t("Quick view")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function LeadsCards({
  rows,
  total,
  onNewLead,
  onQuickView,
  rowSelection,
  onRowSelectionChange,
}: {
  rows: LeadRow[];
  total: number;
  onNewLead: () => void;
  onQuickView?: (row: LeadRow) => void;
  rowSelection: Record<string, boolean>;
  onRowSelectionChange: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  const t = useT();
  const [filters, setFilters] = useQueryStates(leadFilters);

  const setSelected = React.useCallback(
    (id: string, checked: boolean) => {
      onRowSelectionChange((prev) => {
        const next = { ...prev };
        if (checked) next[id] = true;
        else delete next[id];
        return next;
      });
    },
    [onRowSelectionChange],
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

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rows.map((row) => (
          <LeadCard
            key={row.id}
            row={row}
            selected={!!rowSelection[row.id]}
            onSelectedChange={(v) => setSelected(row.id, v)}
            onQuickView={onQuickView}
          />
        ))}
      </div>
      <DataTablePagination
        page={filters.page}
        pageSize={filters.pageSize}
        totalItems={total}
        onPageChange={(p) => setFilters({ page: p })}
        onPageSizeChange={(s) => setFilters({ pageSize: s, page: 1 })}
        pageSizeOptions={LEADS_TABLE_PAGE_SIZE_OPTIONS}
        selectedCount={Object.keys(rowSelection).length}
      />
    </div>
  );
}
