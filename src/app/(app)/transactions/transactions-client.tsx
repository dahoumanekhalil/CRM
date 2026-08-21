"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useQueryStates } from "nuqs";
import { ArrowDownLeft, ArrowUpRight, Receipt, X } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/tables/data-table";
import { DataTablePagination } from "@/components/tables/data-table-pagination";
import { StatusBadge } from "@/components/primitives/status-badge";
import { EmptyState } from "@/components/primitives/empty-state";
import { SearchInput } from "@/components/primitives/search-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "@/lib/schemas/payment";

import { transactionFilters } from "./transaction-filters";
import type { LedgerRow, LedgerSummary } from "./actions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const humanize = (s: string) =>
  s.toLowerCase().split("_").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

function SummaryCards({ summary }: { summary: LedgerSummary }) {
  const isProfit = summary.netTotal >= 0;
  const currency = summary.currency;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card className="gap-0 py-5">
        <CardContent className="flex flex-col gap-2 px-5">
          <div className="flex items-center gap-1.5">
            <ArrowDownLeft className="size-3.5 text-green-600 dark:text-green-400" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Income
            </span>
          </div>
          <span className="text-2xl font-semibold tabular-nums leading-none text-green-600 dark:text-green-400">
            {summary.incomeTotal > 0
              ? formatMoney(summary.incomeTotal, currency)
              : "—"}
          </span>
          <span className="text-xs text-muted-foreground">
            {summary.paymentCount} payment{summary.paymentCount !== 1 ? "s" : ""}
          </span>
        </CardContent>
      </Card>

      <Card className="gap-0 py-5">
        <CardContent className="flex flex-col gap-2 px-5">
          <div className="flex items-center gap-1.5">
            <ArrowUpRight className="size-3.5 text-destructive" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Expenses
            </span>
          </div>
          <span className="text-2xl font-semibold tabular-nums leading-none text-destructive">
            {summary.expenseTotal > 0
              ? formatMoney(summary.expenseTotal, currency)
              : "—"}
          </span>
          <span className="text-xs text-muted-foreground">
            {summary.expenseCount} expense{summary.expenseCount !== 1 ? "s" : ""}
          </span>
        </CardContent>
      </Card>

      <Card
        className={cn(
          "gap-0 py-5 border",
          isProfit
            ? "border-green-200 bg-green-50/40 dark:border-green-900/40 dark:bg-green-950/10"
            : "border-red-200 bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/10"
        )}
      >
        <CardContent className="flex flex-col gap-2 px-5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Net
          </span>
          <span
            className={cn(
              "text-2xl font-semibold tabular-nums leading-none",
              isProfit
                ? "text-green-600 dark:text-green-400"
                : "text-destructive"
            )}
          >
            {formatMoney(summary.netTotal, currency)}
          </span>
          <span className="text-xs text-muted-foreground">
            Income − Expenses
          </span>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  ...PAYMENT_STATUSES.map((s) => ({ value: s, label: humanize(s) })),
];

const METHOD_OPTIONS = [
  { value: "ALL", label: "All methods" },
  ...PAYMENT_METHODS.map((m) => ({ value: m, label: humanize(m) })),
];

function LedgerToolbar({ total }: { total: number }) {
  const [filters, setFilters] = useQueryStates(transactionFilters);

  const hasActiveFilters =
    filters.q !== "" ||
    filters.from !== "" ||
    filters.to !== "" ||
    filters.status !== "ALL" ||
    filters.method !== "ALL" ||
    filters.currency !== "ALL";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          containerClassName="w-64 shrink-0"
          value={filters.q}
          onChange={(v) => setFilters({ q: v, page: 1 })}
          placeholder="Search student, title, reference…"
        />

        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            aria-label="From date"
            value={filters.from}
            onChange={(e) => setFilters({ from: e.target.value, page: 1 })}
            className="h-9 w-[148px] text-sm"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            aria-label="To date"
            value={filters.to}
            onChange={(e) => setFilters({ to: e.target.value, page: 1 })}
            className="h-9 w-[148px] text-sm"
          />
        </div>

        <Select
          value={filters.method}
          onValueChange={(v) => setFilters({ method: v as typeof filters.method, page: 1 })}
        >
          <SelectTrigger size="sm" className="h-9 w-[150px]">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            {METHOD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.currency}
          onValueChange={(v) => setFilters({ currency: v, page: 1 })}
        >
          <SelectTrigger size="sm" className="h-9 w-[120px]">
            <SelectValue placeholder="Currency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All currencies</SelectItem>
            {["DZD", "USD", "EUR", "GBP", "SAR", "AED", "MAD", "EGP"].map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setFilters({ q: "", from: "", to: "", status: "ALL", method: "ALL", currency: "ALL", page: 1 })
            }
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" /> Clear
          </Button>
        ) : null}

        <span className="ms-auto text-xs tabular-nums text-muted-foreground">
          {total} {total === 1 ? "entry" : "entries"}
        </span>
      </div>

      {/* Status filter pills — only meaningful for payment rows */}
      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_OPTIONS.map((tab) => {
          const active = filters.status === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilters({ status: tab.value as typeof filters.status, page: 1 })}
              className={cn(
                "inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-medium transition-colors",
                active
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              {tab.label}
              {tab.value === "ALL" ? (
                <span className="ms-1.5 opacity-70 tabular-nums">{total}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────

function LedgerTable({ rows, total }: { rows: LedgerRow[]; total: number }) {
  const [filters, setFilters] = useQueryStates(transactionFilters);

  const hasFilters =
    filters.q !== "" ||
    filters.from !== "" ||
    filters.to !== "" ||
    filters.status !== "ALL" ||
    filters.method !== "ALL" ||
    filters.currency !== "ALL";

  const columns = React.useMemo<ColumnDef<LedgerRow, unknown>[]>(
    () => [
      {
        id: "type",
        header: "",
        size: 40,
        cell: ({ row }) => (
          <div className="flex justify-center">
            {row.original.kind === "payment" ? (
              <span
                className="inline-flex size-7 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                title="Income"
              >
                <ArrowDownLeft className="size-3.5" />
              </span>
            ) : (
              <span
                className="inline-flex size-7 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                title="Expense"
              >
                <ArrowUpRight className="size-3.5" />
              </span>
            )}
          </div>
        ),
      },
      {
        id: "date",
        header: "Date",
        cell: ({ row }) => (
          <div className="min-w-[100px] space-y-0.5">
            <div className="text-sm tabular-nums">{format(row.original.date, "dd MMM yyyy")}</div>
            <div className="text-xs text-muted-foreground tabular-nums">
              {format(row.original.date, "HH:mm")}
            </div>
          </div>
        ),
      },
      {
        id: "description",
        header: "Description",
        cell: ({ row }) => {
          const r = row.original;
          if (r.kind === "payment") {
            const name =
              [r.student.firstName, r.student.lastName].filter(Boolean).join(" ") ||
              r.student.email ||
              "Unnamed";
            return (
              <div className="min-w-0 space-y-0.5">
                <Link
                  href={`/students/${r.student.id}`}
                  className="truncate text-sm font-medium hover:underline"
                >
                  {name}
                </Link>
                {r.courseName ? (
                  <div className="truncate text-xs text-muted-foreground">{r.courseName}</div>
                ) : null}
              </div>
            );
          }
          return (
            <div className="min-w-0 space-y-0.5">
              <p className="truncate text-sm font-medium">{r.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {r.categoryLabel}
                {r.courseName ? ` · ${r.courseName}` : ""}
              </p>
            </div>
          );
        },
      },
      {
        id: "amount",
        header: () => <span className="block w-full text-end">Amount</span>,
        cell: ({ row }) => {
          const r = row.original;
          const isExpense = r.kind === "expense";
          return (
            <div className="text-end">
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  isExpense ? "text-destructive" : ""
                )}
              >
                {isExpense ? "−" : ""}
                {formatMoney(r.amount, r.currency)}
              </span>
            </div>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const r = row.original;
          if (r.kind === "payment") {
            return <StatusBadge status={r.status} />;
          }
          return (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              Expense
            </span>
          );
        },
      },
      {
        id: "method",
        header: "Method",
        cell: ({ row }) => {
          const r = row.original;
          if (r.kind === "payment") {
            return <StatusBadge status={r.method} tone="neutral" />;
          }
          if (r.reference) {
            return <span className="text-xs text-muted-foreground truncate">{r.reference}</span>;
          }
          return <span className="text-xs text-muted-foreground/40">—</span>;
        },
      },
    ],
    []
  );

  const emptyState = hasFilters ? (
    <EmptyState
      icon={Receipt}
      title="No entries match your filters"
      description="Try adjusting the date range, status, or search terms."
      action={
        <Button
          variant="outline"
          onClick={() =>
            setFilters({ q: "", from: "", to: "", status: "ALL", method: "ALL", currency: "ALL", page: 1 })
          }
        >
          Clear filters
        </Button>
      }
      className="border-0 bg-transparent"
    />
  ) : (
    <EmptyState
      icon={Receipt}
      title="No ledger entries"
      description="Payments and expenses appear here once recorded."
      action={
        <Button variant="outline" asChild>
          <Link href="/payments">Go to Payments</Link>
        </Button>
      }
      className="border-0 bg-transparent"
    />
  );

  return (
    <div className="space-y-2">
      <DataTable
        columns={columns}
        data={rows}
        emptyState={emptyState}
        getRowId={(r) => r.id}
      />
      <DataTablePagination
        page={filters.page}
        pageSize={filters.pageSize}
        totalItems={total}
        onPageChange={(p) => setFilters({ page: p })}
        onPageSizeChange={(s) => setFilters({ pageSize: s, page: 1 })}
        pageSizeOptions={[10, 25, 50]}
        selectedCount={0}
      />
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export function TransactionsClient({
  rows,
  total,
  summary,
}: {
  rows: LedgerRow[];
  total: number;
  summary: LedgerSummary;
}) {
  return (
    <div className="space-y-6">
      <SummaryCards summary={summary} />
      <div className="space-y-4">
        <LedgerToolbar total={total} />
        <LedgerTable rows={rows} total={total} />
      </div>
    </div>
  );
}
