"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useQueryStates } from "nuqs";
import { Receipt, X } from "lucide-react";
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
import type { TransactionRow, TransactionSummary } from "./actions";

// ─── Helpers ────────────────────────────────────────────────────────────────

const humanize = (s: string) =>
  s
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

// ─── Summary Cards ───────────────────────────────────────────────────────────

function SummaryCards({ summary }: { summary: TransactionSummary }) {
  // Find the largest completed currency for primary display
  const currencyEntries = Object.entries(summary.completedByCurrency).sort(
    ([, a], [, b]) => b - a
  );
  const topCurrency = currencyEntries[0];
  const extraCurrencies = currencyEntries.length - 1;

  const receivedValue = topCurrency
    ? formatMoney(topCurrency[1], topCurrency[0])
    : "—";

  const receivedContext =
    extraCurrencies > 0
      ? `+${extraCurrencies} more ${extraCurrencies === 1 ? "currency" : "currencies"}`
      : topCurrency
      ? topCurrency[0]
      : undefined;

  const pendingValue =
    summary.pendingTotal > 0 ? formatMoney(summary.pendingTotal, "USD") : "—";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Received */}
      <Card className="gap-0 py-5">
        <CardContent className="flex flex-col gap-2 px-5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Received
          </span>
          <span
            className={cn(
              "text-2xl font-semibold tabular-nums leading-none",
              topCurrency ? "text-success" : "text-muted-foreground"
            )}
          >
            {receivedValue}
          </span>
          {receivedContext ? (
            <span className="text-xs text-muted-foreground">
              {receivedContext}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              No completed payments
            </span>
          )}
        </CardContent>
      </Card>

      {/* Pending */}
      <Card className="gap-0 py-5">
        <CardContent className="flex flex-col gap-2 px-5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Pending
          </span>
          <span
            className={cn(
              "text-2xl font-semibold tabular-nums leading-none",
              summary.pendingTotal > 0
                ? "text-warning"
                : "text-muted-foreground"
            )}
          >
            {pendingValue}
          </span>
          <span className="text-xs text-muted-foreground">
            Awaiting payment
          </span>
        </CardContent>
      </Card>

      {/* Transactions count */}
      <Card className="gap-0 py-5">
        <CardContent className="flex flex-col gap-2 px-5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Transactions
          </span>
          <span className="text-2xl font-semibold tabular-nums leading-none">
            {summary.totalCount.toLocaleString()}
          </span>
          {summary.refundedCount > 0 ? (
            <span className="text-xs text-muted-foreground">
              {summary.refundedCount.toLocaleString()} refunded
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              Total in view
            </span>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  ...PAYMENT_STATUSES.map((s) => ({ value: s, label: humanize(s) })),
];

const METHOD_OPTIONS = [
  { value: "ALL", label: "All methods" },
  ...PAYMENT_METHODS.map((m) => ({ value: m, label: humanize(m) })),
];

function TransactionsToolbar({ total }: { total: number }) {
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
      {/* Row 1: search + date range + method/currency + clear */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          containerClassName="w-64 shrink-0"
          value={filters.q}
          onChange={(v) => setFilters({ q: v, page: 1 })}
          placeholder="Search student, reference…"
        />

        {/* Date range */}
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
          onValueChange={(v) =>
            setFilters({
              method: v as typeof filters.method,
              page: 1,
            })
          }
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
            {["USD", "EUR", "GBP", "SAR", "AED", "MAD", "EGP"].map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setFilters({
                q: "",
                from: "",
                to: "",
                status: "ALL",
                method: "ALL",
                currency: "ALL",
                page: 1,
              })
            }
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" /> Clear
          </Button>
        ) : null}
      </div>

      {/* Row 2: status tab pills */}
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

// ─── Table ───────────────────────────────────────────────────────────────────

function TransactionsTable({
  rows,
  total,
}: {
  rows: TransactionRow[];
  total: number;
}) {
  const [filters, setFilters] = useQueryStates(transactionFilters);

  const hasFilters =
    filters.q !== "" ||
    filters.from !== "" ||
    filters.to !== "" ||
    filters.status !== "ALL" ||
    filters.method !== "ALL" ||
    filters.currency !== "ALL";

  const columns = React.useMemo<ColumnDef<TransactionRow, unknown>[]>(
    () => [
      {
        id: "date",
        header: "Date",
        cell: ({ row }) => {
          const date = row.original.paidAt ?? row.original.createdAt;
          return (
            <div className="min-w-[110px] space-y-0.5">
              <div className="text-sm tabular-nums">
                {format(date, "dd MMM yyyy")}
              </div>
              <div className="text-xs text-muted-foreground tabular-nums">
                {format(date, "HH:mm")}
              </div>
            </div>
          );
        },
      },
      {
        id: "student",
        header: "Student",
        cell: ({ row }) => {
          const s = row.original.student;
          const name =
            [s.firstName, s.lastName].filter(Boolean).join(" ") ||
            s.email ||
            "Unnamed";
          const initials = getInitials(s.firstName || "?", s.lastName || "?");
          return (
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                {initials}
              </div>
              <div className="min-w-0">
                <Link
                  href={`/students/${s.id}`}
                  className="truncate text-sm font-medium hover:underline"
                >
                  {name}
                </Link>
                <div className="truncate text-xs text-muted-foreground">
                  {s.email}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        id: "course",
        header: "Course",
        cell: ({ row }) => {
          const reg = row.original.registration;
          if (!reg?.session) {
            return <span className="text-sm text-muted-foreground/60">—</span>;
          }
          return (
            <div className="min-w-0 space-y-0.5">
              <div className="truncate text-sm">
                {reg.session.course.name}
              </div>
              {reg.session.title ? (
                <div className="truncate text-xs text-muted-foreground">
                  {reg.session.title}
                </div>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "amount",
        header: () => (
          <span className="block w-full text-end">Amount</span>
        ),
        cell: ({ row }) => (
          <div className="text-end">
            <span className="text-sm font-semibold tabular-nums">
              {formatMoney(row.original.amount, row.original.currency)}
            </span>
            <span className="ms-1.5 text-xs text-muted-foreground">
              {row.original.currency}
            </span>
          </div>
        ),
      },
      {
        id: "method",
        header: "Method",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.method}
            tone="neutral"
          />
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge status={row.original.status} />
        ),
      },
    ],
    []
  );

  const emptyState = hasFilters ? (
    <EmptyState
      icon={Receipt}
      title="No transactions match your filters"
      description="Try adjusting the date range, status, or search terms."
      action={
        <Button
          variant="outline"
          onClick={() =>
            setFilters({
              q: "",
              from: "",
              to: "",
              status: "ALL",
              method: "ALL",
              currency: "ALL",
              page: 1,
            })
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
      title="No transactions found"
      description="Adjust your filters or record a payment in the Payments section."
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

// ─── Root export ─────────────────────────────────────────────────────────────

export function TransactionsClient({
  rows,
  total,
  summary,
}: {
  rows: TransactionRow[];
  total: number;
  summary: TransactionSummary;
}) {
  return (
    <div className="space-y-6">
      <SummaryCards summary={summary} />
      <div className="space-y-4">
        <TransactionsToolbar total={total} />
        <TransactionsTable rows={rows} total={total} />
      </div>
    </div>
  );
}
