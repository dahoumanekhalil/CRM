"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryStates, parseAsString } from "nuqs";

import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/primitives/search-input";
import { EmptyState } from "@/components/primitives/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_STATUSES,
} from "@/lib/schemas/expense";
import { deleteExpense, type ExpenseRow } from "./actions";
import { ExpenseSheet } from "./expense-sheet";

const shallowFalse = { shallow: false, clearOnDefault: true } as const;

const expenseFilters = {
  q: parseAsString.withDefault("").withOptions(shallowFalse),
  category: parseAsString.withDefault("").withOptions(shallowFalse),
  status: parseAsString.withDefault("ALL").withOptions(shallowFalse),
};

function formatMoney(n: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${n.toLocaleString()} ${currency}`;
  }
}

const STATUS_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pending",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-muted text-muted-foreground",
  },
};

export function ExpensesClient({
  rows,
  total,
}: {
  rows: ExpenseRow[];
  total: number;
}) {
  const router = useRouter();
  const [filters, setFilters] = useQueryStates(expenseFilters);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ExpenseRow | null>(null);
  const [deleting, setDeleting] = React.useState<string | null>(null);

  const hasFilters = filters.q !== "" || filters.category !== "" || filters.status !== "ALL";

  async function handleDelete(id: string) {
    setDeleting(id);
    const res = await deleteExpense(id);
    setDeleting(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Expense deleted");
    router.refresh();
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2 sm:max-w-xl">
            <SearchInput
              containerClassName="flex-1"
              value={filters.q}
              onChange={(v) => setFilters({ q: v })}
              placeholder="Search by title, reference…"
            />
            <Select
              value={filters.category}
              onValueChange={(v) => setFilters({ category: v })}
            >
              <SelectTrigger size="sm" className="h-9 w-[180px] shrink-0">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All categories</SelectItem>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {EXPENSE_CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            {hasFilters ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({ q: "", category: "", status: "ALL" })}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" /> Clear
              </Button>
            ) : null}
            <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
              {total} {total === 1 ? "expense" : "expenses"}
            </span>
            <Button size="sm" onClick={() => { setEditing(null); setSheetOpen(true); }}>
              <Plus /> Record expense
            </Button>
          </div>
        </div>

        {/* Status filter pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(["ALL", ...EXPENSE_STATUSES] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilters({ status: s })}
              className={cn(
                "inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-medium transition-colors",
                filters.status === s
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              {s === "ALL"
                ? "All"
                : s.charAt(0) + s.slice(1).toLowerCase()}
              {s === "ALL" ? (
                <span className="ms-1.5 tabular-nums opacity-70">{total}</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses recorded"
          description="Record your first expense to track costs against your courses."
          action={
            <Button size="sm" onClick={() => setSheetOpen(true)}>
              <Plus /> Record expense
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground">
                  Expense
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground">
                  Category
                </th>
                <th className="px-4 py-3 text-end text-xs font-medium text-muted-foreground">
                  Amount
                </th>
                <th className="hidden px-4 py-3 text-start text-xs font-medium text-muted-foreground sm:table-cell">
                  Date
                </th>
                <th className="hidden px-4 py-3 text-start text-xs font-medium text-muted-foreground md:table-cell">
                  Course / Run
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((r) => {
                const badge = STATUS_BADGE[r.status];
                return (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium truncate max-w-[180px]">{r.title}</p>
                      {r.reference ? (
                        <p className="text-xs text-muted-foreground">
                          Ref: {r.reference}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {EXPENSE_CATEGORY_LABELS[r.category as keyof typeof EXPENSE_CATEGORY_LABELS] ?? r.category}
                    </td>
                    <td className="px-4 py-3 text-end font-medium tabular-nums">
                      {formatMoney(r.amount, r.currency)}
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-muted-foreground sm:table-cell tabular-nums">
                      {format(new Date(r.expenseDate), "MMM d, yyyy")}
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                      {r.courseName ? (
                        <span>
                          {r.courseName}
                          {r.sessionTitle ? (
                            <span className="text-muted-foreground/70">
                              {" "}· {r.sessionTitle}
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="opacity-40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {badge ? (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            badge.className
                          )}
                        >
                          {badge.label}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="size-7 p-0">
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => { setEditing(r); setSheetOpen(true); }}
                          >
                            <Pencil className="size-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(r.id)}
                            disabled={deleting === r.id}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="size-4" />
                            {deleting === r.id ? "Deleting…" : "Delete"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Sheet */}
      {editing ? (
        <ExpenseSheet
          key={editing.id}
          mode="edit"
          expense={editing}
          open={sheetOpen}
          onOpenChange={(o) => { setSheetOpen(o); if (!o) setEditing(null); }}
        />
      ) : (
        <ExpenseSheet
          mode="create"
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      )}
    </>
  );
}
