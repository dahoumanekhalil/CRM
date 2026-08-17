"use client";

import * as React from "react";
import Link from "next/link";
import { MoreHorizontal, Mail, Phone, Contact, Clock, Star, Eye, PhoneCall, AlarmClock, MessageCircle, Plus } from "lucide-react";
import { isPast, isToday, parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import { useQueryStates } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";

import { cn } from "@/lib/utils";
import { DataTable } from "@/components/tables/data-table";
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header";
import { DataTablePagination } from "@/components/tables/data-table-pagination";
import { StatusBadge } from "@/components/primitives/status-badge";
import { EmptyState } from "@/components/primitives/empty-state";
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
import { leadFilters } from "./leads-filters";
import type { LeadRow } from "./actions";

function NoteCell({ leadId, body }: { leadId: string; body: string | null | undefined }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const preview = body && body.length > 30 ? body.slice(0, 30) + "…" : body;

  return (
    <div
      className="group flex items-center gap-1.5"
      onClick={(e) => e.stopPropagation()}
    >
      {body ? (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground cursor-default max-w-[150px]">
                <MessageCircle className="size-3 shrink-0" />
                <span className="truncate">{preview}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-[280px] whitespace-pre-wrap text-xs leading-relaxed"
            >
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
        className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0 flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted"
      >
        <Plus className="size-3" />
        Note
      </button>

      <CommunicationSheet
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) router.refresh();
        }}
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
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function LeadsTable({
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
  const router = useRouter();
  const [filters, setFilters] = useQueryStates(leadFilters);

  const toggleSort = (key: "createdAt" | "firstName" | "status") => {
    setFilters((prev) => {
      if (prev.sortBy !== key) {
        return { ...prev, sortBy: key, sortDir: "asc", page: 1 };
      }
      return {
        ...prev,
        sortDir: prev.sortDir === "asc" ? "desc" : "asc",
        page: 1,
      };
    });
  };

  const sortDirFor = (key: "createdAt" | "firstName" | "status") =>
    filters.sortBy === key ? filters.sortDir : false;

  const columns = React.useMemo<ColumnDef<LeadRow>[]>(
    () => [
      {
        id: "select",
        size: 32,
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
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
        accessorKey: "firstName",
        header: () => (
          <DataTableColumnHeader
            title="Lead"
            sortDir={sortDirFor("firstName")}
            onToggleSort={() => toggleSort("firstName")}
          />
        ),
        cell: ({ row }) => {
          const name = fullName(row.original) || "—";
          const due = row.original.nextActionDue
            ? parseISO(row.original.nextActionDue.toString())
            : null;
          const isOverdue = due && isPast(due) && !isToday(due);
          const isDueToday = due && isToday(due);
          return (
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <Avatar className="size-8">
                  <AvatarFallback className="text-[11px] font-semibold bg-primary/10 text-primary">
                    {initials(name || "?")}
                  </AvatarFallback>
                </Avatar>
                {row.original.isHighPriority ? (
                  <Star className="absolute -top-1 -end-1 size-3 fill-amber-400 text-amber-400" />
                ) : null}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{name}</div>
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
                    {row.original.source ?? "No source"}
                  </div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        id: "contact",
        header: "Contact",
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
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
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
        accessorKey: "status",
        header: () => (
          <DataTableColumnHeader
            title="Status"
            sortDir={sortDirFor("status")}
            onToggleSort={() => toggleSort("status")}
          />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <StatusBadge status={row.original.status} />
            {!row.original.subscribed ? (
              <span
                title="Unsubscribed — do not retarget"
                className="inline-flex items-center rounded-md border border-border/60 bg-muted/40 px-1.5 py-0 text-[10px] uppercase tracking-wider text-muted-foreground"
              >
                Unsub
              </span>
            ) : null}
          </div>
        ),
      },
      {
        id: "lastNote",
        header: "Last note",
        cell: ({ row }) => (
          <NoteCell
            leadId={row.original.id}
            body={row.original.communications?.[0]?.body}
          />
        ),
      },
      {
        id: "callTime",
        header: () => (
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <AlarmClock className="size-3.5" />
            Best time to call
          </span>
        ),
        cell: ({ row }) => {
          const t = (row.original as Record<string, unknown>).preferredCallTime as string | null;
          return t ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400 whitespace-nowrap">
              <AlarmClock className="size-3" />
              {t}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/40">—</span>
          );
        },
      },
      {
        id: "actions",
        size: 40,
        header: "",
        enableSorting: false,
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
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {onQuickView ? (
                  <DropdownMenuItem onSelect={() => onQuickView(row.original)}>
                    <Eye className="size-3.5" />
                    Quick view
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem asChild>
                  <Link href={`/leads/${row.original.id}`}>Open</Link>
                </DropdownMenuItem>
                <DropdownMenuItem disabled>Edit</DropdownMenuItem>
                <DropdownMenuItem disabled>Convert</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled
                  className="text-destructive focus:text-destructive"
                >
                  Delete
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
        title="No leads match your filters"
        description="Try clearing filters or searching for something else."
        action={
          <Button
            variant="outline"
            onClick={() =>
              setFilters({ q: "", status: "ALL", page: 1 })
            }
          >
            Clear filters
          </Button>
        }
        className="border-0 bg-transparent"
      />
    ) : (
      <EmptyState
        icon={Contact}
        title="No leads yet"
        description="Create your first lead to start managing your sales pipeline."
        action={<Button onClick={onNewLead}>Add your first lead</Button>}
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
        getRowId={(r) => r.id}
        onRowClick={(row) => router.push(`/leads/${row.id}`)}
      />
      <DataTablePagination
        page={filters.page}
        pageSize={filters.pageSize}
        totalItems={total}
        onPageChange={(p) => setFilters({ page: p })}
        onPageSizeChange={(s) => setFilters({ pageSize: s, page: 1 })}
        selectedCount={Object.keys(rowSelection).length}
      />
    </div>
  );
}
