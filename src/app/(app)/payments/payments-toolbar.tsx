"use client";

import * as React from "react";
import { useQueryStates } from "nuqs";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/primitives/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { paymentFilters } from "./payments-filters";
import {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from "@/lib/schemas/payment";
import { exportPaymentsCsv } from "./export";
import { CsvExportButton } from "@/components/primitives/csv-export-button";

const humanize = (s: string) =>
  s
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

const STATUS_TABS = [
  { value: "ALL" as const, label: "All" },
  ...PAYMENT_STATUSES.map((s) => ({ value: s, label: humanize(s) })),
];

export function PaymentsToolbar({
  total,
  onNewPayment,
}: {
  total: number;
  onNewPayment: () => void;
}) {
  const [filters, setFilters] = useQueryStates(paymentFilters);

  const hasActiveFilters =
    filters.q !== "" ||
    filters.status !== "ALL" ||
    filters.method !== "ALL" ||
    filters.studentId !== "";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2 sm:max-w-xl">
          <SearchInput
            containerClassName="flex-1"
            value={filters.q}
            onChange={(v) => setFilters({ q: v, page: 1 })}
            placeholder="Search by student, reference…"
          />
          <Select
            value={filters.method}
            onValueChange={(v) =>
              setFilters({
                method: v as (typeof PAYMENT_METHODS)[number] | "ALL",
                page: 1,
              })
            }
          >
            <SelectTrigger size="sm" className="h-9 w-[150px] shrink-0">
              <SelectValue placeholder="Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All methods</SelectItem>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m} value={m}>
                  {humanize(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setFilters({
                  q: "",
                  status: "ALL",
                  method: "ALL",
                  studentId: "",
                  page: 1,
                })
              }
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" /> Clear
            </Button>
          ) : null}
          <CsvExportButton
            label="Export"
            onExport={() =>
              exportPaymentsCsv({
                q: filters.q || undefined,
                status: filters.status !== "ALL" ? filters.status : undefined,
                method: filters.method !== "ALL" ? filters.method : undefined,
                studentId: filters.studentId || undefined,
              })
            }
          />
          <Button onClick={onNewPayment} size="sm">
            <Plus /> Record payment
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_TABS.map((tab) => {
          const active = filters.status === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilters({ status: tab.value, page: 1 })}
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
