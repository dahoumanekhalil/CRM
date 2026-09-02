"use client";

import * as React from "react";
import Link from "next/link";
import { MoreHorizontal, Mail, Contact, Clock, Star, Eye, PhoneCall, AlarmClock, MessageCircle, Plus, BookOpen, ChevronDown, User as UserIcon, Tag } from "lucide-react";
import { format, isPast, isToday, parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import { useQueryStates } from "nuqs";
import { toast } from "sonner";
import type { ColumnDef, VisibilityState } from "@tanstack/react-table";

import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/use-t";
import { DataTable } from "@/components/tables/data-table";
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header";
import { DataTablePagination } from "@/components/tables/data-table-pagination";
import { EmptyState } from "@/components/primitives/empty-state";
import { StatusBadge } from "@/components/primitives/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CommunicationSheet } from "@/components/shared/communication-sheet";
import { calcPaymentStatus } from "@/lib/payment-status";
import { VISIBLE_LEAD_STATUSES, type VisibleLeadStatus } from "@/lib/schemas/lead";
import { leadFilters } from "./leads-filters";
import { LEADS_TABLE_PAGE_SIZE_OPTIONS } from "./leads-view-constants";
import { updateLeadStatusDirect, type LeadRow } from "./actions";

// ─── Status color system ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { avatar: string; row: string; label: string }> = {
  NEW:             { avatar: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",       row: "",                                                         label: "New" },
  ASSIGNED:        { avatar: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300", row: "bg-indigo-50/30 dark:bg-indigo-950/10",                   label: "Assigned" },
  CONTACTED:       { avatar: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",         row: "bg-blue-50/40 dark:bg-blue-950/10",                       label: "Contacted" },
  INTERESTED:      { avatar: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300", row: "bg-violet-50/40 dark:bg-violet-950/10",                   label: "Interested" },
  FOLLOW_UP:       { avatar: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",     row: "bg-amber-50/40 dark:bg-amber-950/10",                     label: "Interested" },
  CONFIRMED:       { avatar: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300", row: "bg-purple-50/40 dark:bg-purple-950/10",                   label: "Confirmed" },
  REGISTERED:      { avatar: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",     row: "bg-green-50/60 dark:bg-green-950/20",                     label: "Registered" },
  LOST:            { avatar: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",             row: "bg-red-50/60 dark:bg-red-950/20",                         label: "Lost" },
  NOT_INTERESTED:  { avatar: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",         row: "bg-rose-50/40 dark:bg-rose-950/10",                       label: "Not interested" },
  UNREACHABLE:     { avatar: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300", row: "bg-orange-50/40 dark:bg-orange-950/10",                   label: "Unreachable" },
};

function statusConfig(status: string) {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.NEW;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function NoteCell({ leadId, body }: { leadId: string; body: string | null | undefined }) {
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = React.useState(false);
  const preview = body && body.length > 30 ? body.slice(0, 30) + "…" : body;

  return (
    <div className="group flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {body ? (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground cursor-default max-w-[150px]">
                <MessageCircle className="size-3 shrink-0" />
                <span className="truncate">{preview}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[280px] whitespace-pre-wrap text-xs leading-relaxed">
              {body}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <span className="text-xs text-muted-foreground/40 italic">—</span>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="opacity-0 group-hover:opacity-100 transition-opacity ms-auto shrink-0 flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted"
      >
        <Plus className="size-3" />
        {t("Note")}
      </button>
      <CommunicationSheet
        open={open}
        onOpenChange={(v) => { setOpen(v); if (!v) router.refresh(); }}
        leadId={leadId}
        defaultType="NOTE"
      />
    </div>
  );
}

function fullName(row: LeadRow) {
  return [row.firstName, row.lastName].filter(Boolean).join(" ");
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

// ─── Inline status editor ─────────────────────────────────────────────────────

// FOLLOW_UP is a legacy DB value — kept out of the picker to avoid re-creating
// leads in the deprecated state. Existing FOLLOW_UP leads render as "Interested"
// via the status→tone/label mapping and get migrated when the user picks any
// other value.
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

function LeadStatusCell({ leadId, status }: { leadId: string; status: string }) {
  const router = useRouter();
  const t = useT();
  // Optimistic local status — snaps back on server failure. `pending` guards
  // against double-clicks while the mutation is in flight.
  const [pending, startTransition] = React.useTransition();
  const [localStatus, setLocalStatus] = React.useState(status);
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalStatus(status);
  }, [status]);

  const commit = (next: VisibleLeadStatus) => {
    if (next === localStatus || pending) return;
    const previous = localStatus;
    setLocalStatus(next);
    startTransition(async () => {
      const res = await updateLeadStatusDirect(leadId, next);
      if (!res.ok) {
        setLocalStatus(previous);
        toast.error(res.error);
        return;
      }
      toast.success(t("Status updated"));
      router.refresh();
    });
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={pending}
            className={cn(
              "inline-flex items-center gap-1 rounded-md transition-opacity hover:opacity-80",
              pending && "opacity-50",
            )}
          >
            <StatusBadge status={localStatus} />
            <ChevronDown className="size-3 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuLabel>{t("Change status")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {VISIBLE_LEAD_STATUSES.map((s) => (
            <DropdownMenuItem
              key={s}
              onSelect={() => commit(s)}
              className={cn(s === localStatus && "font-semibold")}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  s === localStatus ? "bg-primary" : "bg-muted-foreground/40",
                )}
              />
              {t(STATUS_LABELS[s])}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────

export function LeadsTable({
  rows,
  total,
  onNewLead,
  onQuickView,
  rowSelection,
  onRowSelectionChange,
  columnVisibility,
  onColumnVisibilityChange,
}: {
  rows: LeadRow[];
  total: number;
  onNewLead: () => void;
  onQuickView?: (row: LeadRow) => void;
  rowSelection: Record<string, boolean>;
  onRowSelectionChange: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: React.Dispatch<React.SetStateAction<VisibilityState>>;
}) {
  const router = useRouter();
  const t = useT();
  const [filters, setFilters] = useQueryStates(leadFilters);

  type SortKey =
    | "createdAt"
    | "firstName"
    | "status"
    | "email"
    | "phone"
    | "city"
    | "callTime";
  const toggleSort = (key: SortKey) => {
    setFilters((prev) => {
      if (prev.sortBy !== key) return { ...prev, sortBy: key, sortDir: "asc", page: 1 };
      return { ...prev, sortDir: prev.sortDir === "asc" ? "desc" : "asc", page: 1 };
    });
  };

  const sortDirFor = (key: SortKey) =>
    filters.sortBy === key ? filters.sortDir : false;

  const columns = React.useMemo<ColumnDef<LeadRow>[]>(
    () => [
      {
        id: "select",
        size: 32,
        enableHiding: false,
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all"
            className="translate-y-[1px]"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label={`Select ${fullName(row.original)}`}
            className="translate-y-[1px]"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
      },
      {
        id: "name",
        accessorKey: "firstName",
        meta: { label: t("Lead"), className: "max-w-[220px]" },
        size: 220,
        enableHiding: false,
        header: () => (
          <DataTableColumnHeader
            title={t("Lead")}
            sortDir={sortDirFor("firstName")}
            onToggleSort={() => toggleSort("firstName")}
          />
        ),
        cell: ({ row }) => {
          const name = fullName(row.original) || "—";
          const cfg = statusConfig(row.original.status);
          const payDot = calcPaymentStatus(
            (row.original as Record<string, unknown>).student
              ? ((row.original as Record<string, unknown>).student as { registrations: Parameters<typeof calcPaymentStatus>[0] }).registrations
              : null
          );
          const due = row.original.nextActionDue
            ? parseISO(row.original.nextActionDue.toString())
            : null;
          const isOverdue = due && isPast(due) && !isToday(due);
          const isDueToday = due && isToday(due);
          return (
            <div className="flex items-center gap-2 min-w-0 max-w-[220px]">
              <div className="relative shrink-0">
                <Avatar className="size-7">
                  <AvatarFallback className={cn("text-[10px] font-semibold", cfg.avatar)}>
                    {initials(name || "?")}
                  </AvatarFallback>
                </Avatar>
                {payDot === "full" && (
                  <span className="absolute -bottom-0.5 -end-0.5 size-2 rounded-full border-2 border-background bg-green-500" title="Fully paid" />
                )}
                {payDot === "partial" && (
                  <span className="absolute -bottom-0.5 -end-0.5 size-2 rounded-full border-2 border-background bg-orange-500" title="Partially paid" />
                )}
                {row.original.isHighPriority ? (
                  <Star className="absolute -top-1 -end-1 size-2.5 fill-amber-400 text-amber-400" />
                ) : null}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium leading-tight">{name}</div>
                {row.original.nextAction ? (
                  <div className={cn(
                    "flex items-center gap-1 truncate text-xs",
                    isOverdue ? "text-destructive" : isDueToday ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                  )}>
                    <Clock className="size-3 shrink-0" />
                    <span className="truncate">{row.original.nextAction}</span>
                  </div>
                ) : (
                  <div className="truncate text-xs text-muted-foreground">
                    {cfg.label}
                  </div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        id: "status",
        meta: { label: t("Status") },
        header: () => (
          <DataTableColumnHeader
            title={t("Status")}
            sortDir={sortDirFor("status")}
            onToggleSort={() => toggleSort("status")}
          />
        ),
        cell: ({ row }) => (
          <LeadStatusCell leadId={row.original.id} status={row.original.status} />
        ),
      },
      {
        id: "contact",
        meta: { label: t("Contact") },
        header: () => t("Contact"),
        cell: ({ row }) => (
          <div className="flex flex-col gap-1 text-sm">
            {row.original.phone ? (
              <a
                href={`tel:${row.original.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors w-fit"
              >
                <PhoneCall className="size-3.5" />
                {row.original.phone}
              </a>
            ) : null}
            {row.original.email ? (
              <a
                href={`mailto:${row.original.email}`}
                onClick={(e) => e.stopPropagation()}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="size-3" />
                <span className="truncate max-w-[140px]">{row.original.email}</span>
              </a>
            ) : null}
            {!row.original.email && !row.original.phone ? (
              <span className="text-xs text-muted-foreground">—</span>
            ) : null}
          </div>
        ),
      },
      {
        id: "email",
        meta: { label: t("Email") },
        header: () => (
          <DataTableColumnHeader
            title={t("Email")}
            sortDir={sortDirFor("email")}
            onToggleSort={() => toggleSort("email")}
          />
        ),
        cell: ({ row }) =>
          row.original.email ? (
            <a
              href={`mailto:${row.original.email}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-muted-foreground hover:text-foreground truncate block max-w-[220px]"
            >
              {row.original.email}
            </a>
          ) : (
            <span className="text-xs text-muted-foreground/40">—</span>
          ),
      },
      {
        id: "phone",
        meta: { label: t("Phone") },
        header: () => (
          <DataTableColumnHeader
            title={t("Phone")}
            sortDir={sortDirFor("phone")}
            onToggleSort={() => toggleSort("phone")}
          />
        ),
        cell: ({ row }) =>
          row.original.phone ? (
            <a
              href={`tel:${row.original.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-muted-foreground hover:text-foreground truncate block max-w-[140px]"
            >
              {row.original.phone}
            </a>
          ) : (
            <span className="text-xs text-muted-foreground/40">—</span>
          ),
      },
      {
        id: "city",
        meta: { label: t("City") },
        header: () => (
          <DataTableColumnHeader
            title={t("City")}
            sortDir={sortDirFor("city")}
            onToggleSort={() => toggleSort("city")}
          />
        ),
        cell: ({ row }) => {
          const city = (row.original as Record<string, unknown>).city as string | null;
          return city ? (
            <span className="text-xs text-foreground truncate block max-w-[140px]" title={city}>
              {city}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/40">—</span>
          );
        },
      },
      {
        id: "owner",
        meta: { label: t("Owner") },
        header: () => (
          <span className="inline-flex items-center gap-1.5">
            <UserIcon className="size-3.5" /> {t("Owner")}
          </span>
        ),
        cell: ({ row }) => {
          const owner = (row.original as Record<string, unknown>).owner as
            | { name: string | null; email: string | null }
            | null;
          if (!owner) {
            return <span className="text-xs text-muted-foreground/60 italic">{t("Unassigned")}</span>;
          }
          return (
            <span className="text-xs text-muted-foreground truncate block max-w-[140px]" title={owner.email ?? undefined}>
              {owner.name ?? owner.email ?? "—"}
            </span>
          );
        },
      },
      {
        id: "course",
        meta: { label: t("Course") },
        header: () => (
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="size-3.5" /> {t("Course")}
          </span>
        ),
        cell: ({ row }) => {
          const course = (row.original as Record<string, unknown>).course as
            | { name: string }
            | null;
          return course ? (
            <span className="text-xs text-muted-foreground truncate block max-w-[160px]" title={course.name}>
              {course.name}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/40">—</span>
          );
        },
      },
      {
        id: "tags",
        meta: { label: t("Tags") },
        header: () => (
          <span className="inline-flex items-center gap-1.5">
            <Tag className="size-3.5" /> {t("Tags")}
          </span>
        ),
        cell: ({ row }) => {
          const tags = (row.original as Record<string, unknown>).tags as string[] | null;
          if (!tags || tags.length === 0) return <span className="text-xs text-muted-foreground/40">—</span>;
          const shown = tags.slice(0, 3);
          const extra = tags.length - shown.length;
          return (
            <div className="flex flex-wrap gap-1 max-w-[200px]">
              {shown.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium"
                >
                  {tag}
                </span>
              ))}
              {extra > 0 ? (
                <span className="text-[10px] text-muted-foreground">+{extra}</span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "lastNote",
        meta: { label: t("Last note") },
        header: () => t("Last note"),
        cell: ({ row }) => (
          <NoteCell leadId={row.original.id} body={row.original.communications?.[0]?.body} />
        ),
      },
      {
        id: "callTime",
        meta: { label: t("Best time to call") },
        header: () => (
          <DataTableColumnHeader
            title={t("Best time to call")}
            sortDir={sortDirFor("callTime")}
            onToggleSort={() => toggleSort("callTime")}
          />
        ),
        cell: ({ row }) => {
          const callTime = (row.original as Record<string, unknown>).preferredCallTime as string | null;
          return callTime ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400 whitespace-nowrap">
              <AlarmClock className="size-3" />
              {callTime}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/40">—</span>
          );
        },
      },
      {
        id: "priority",
        meta: { label: t("Priority") },
        header: () => (
          <span className="inline-flex items-center gap-1.5">
            <Star className="size-3.5" /> {t("Priority")}
          </span>
        ),
        cell: ({ row }) =>
          row.original.isHighPriority ? (
            <Star className="size-4 fill-amber-400 text-amber-400" />
          ) : (
            <span className="text-xs text-muted-foreground/40">—</span>
          ),
      },
      {
        id: "createdAt",
        meta: { label: t("Created") },
        header: () => (
          <DataTableColumnHeader
            title={t("Created")}
            sortDir={sortDirFor("createdAt")}
            onToggleSort={() => toggleSort("createdAt")}
          />
        ),
        cell: ({ row }) => {
          const raw = (row.original as Record<string, unknown>).createdAt as string | Date | null;
          if (!raw) return <span className="text-xs text-muted-foreground/40">—</span>;
          const d = typeof raw === "string" ? parseISO(raw) : raw;
          return (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {format(d, "MMM d, yyyy")}
            </span>
          );
        },
      },
      {
        id: "actions",
        size: 40,
        header: "",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <MoreHorizontal />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>{t("Actions")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {onQuickView ? (
                  <DropdownMenuItem onSelect={() => onQuickView(row.original)}>
                    <Eye className="size-3.5" />
                    {t("Quick view")}
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem asChild>
                  <Link href={`/leads/${row.original.id}`}>{t("Open")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem disabled>{t("Edit")}</DropdownMenuItem>
                <DropdownMenuItem disabled>{t("Convert")}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="text-destructive focus:text-destructive">
                  {t("Delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [filters.sortBy, filters.sortDir, onQuickView] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const emptyState =
    filters.q || filters.status !== "ALL" ? (
      <EmptyState
        icon={Contact}
        title={t("No leads match your filters")}
        description={t("Try clearing filters or searching for something else.")}
        action={
          <Button variant="outline" onClick={() => setFilters({ q: "", status: "ALL", page: 1 })}>
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
    );

  return (
    <div className="space-y-2">
      <DataTable
        columns={columns}
        data={rows}
        emptyState={emptyState}
        rowSelection={rowSelection}
        onRowSelectionChange={onRowSelectionChange}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={onColumnVisibilityChange}
        getRowId={(r) => r.id}
        onRowClick={(row) => router.push(`/leads/${row.id}`)}
        getRowClassName={(row) => statusConfig(row.status).row}
      />
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
