"use client";

import * as React from "react";
import Link from "next/link";
import { useQueryStates } from "nuqs";
import { Plus, Upload, X } from "lucide-react";

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
import { useT } from "@/lib/i18n/use-t";

import { leadFilters } from "./leads-filters";
import { VISIBLE_LEAD_STATUSES, LEAD_FOLLOW_UP_FILTERS } from "@/lib/schemas/lead";
import { Star } from "lucide-react";
import type { LeadCoursePickerItem } from "./actions";
import { exportLeadsCsv } from "./export";
import { CsvExportButton } from "@/components/primitives/csv-export-button";

const humanize = (s: string) =>
  s
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

const STATUS_TABS = [
  { value: "ALL" as const, label: "All" },
  ...VISIBLE_LEAD_STATUSES.map((s) => ({ value: s, label: humanize(s) })),
];

export function LeadsToolbar({
  total,
  onNewLead,
  courses,
  hideOwnershipFilter = false,
}: {
  total: number;
  onNewLead: () => void;
  courses: LeadCoursePickerItem[];
  hideOwnershipFilter?: boolean;
}) {
  const t = useT();
  const [filters, setFilters] = useQueryStates(leadFilters);

  const hasActiveFilters =
    filters.q !== "" ||
    filters.status !== "ALL" ||
    filters.courseId !== "" ||
    filters.followUp !== "ALL" ||
    filters.ownership !== "all" ||
    filters.highPriority;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2 sm:max-w-xl">
          <SearchInput
            containerClassName="flex-1"
            value={filters.q}
            onChange={(v) => setFilters({ q: v, page: 1 })}
            placeholder={t("Search leads by name, email, phone…")}
          />
          <Select
            value={filters.courseId || "__all"}
            onValueChange={(v) =>
              setFilters({ courseId: v === "__all" ? "" : v, page: 1 })
            }
          >
            <SelectTrigger size="sm" className="h-9 w-[180px] shrink-0">
              <SelectValue placeholder="Course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">{t("All courses")}</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
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
                setFilters({ q: "", status: "ALL", courseId: "", followUp: "ALL", ownership: "all", highPriority: false, page: 1 })
              }
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" /> {t("Clear")}
            </Button>
          ) : null}
          <CsvExportButton
            label="Export"
            onExport={() =>
              exportLeadsCsv({
                q: filters.q || undefined,
                status: filters.status !== "ALL" ? filters.status : undefined,
                courseId: filters.courseId || undefined,
              })
            }
          />
          <Button variant="outline" size="sm" asChild>
            <Link href="/leads/import">
              <Upload className="size-3.5" /> {t("Import")}
            </Link>
          </Button>
          <Button onClick={onNewLead} size="sm">
            <Plus /> {t("New lead")}
          </Button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_TABS.map((tab) => {
          const active = filters.status === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() =>
                setFilters({ status: tab.value, page: 1 })
              }
              className={cn(
                "inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-medium transition-colors",
                active
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              {t(tab.label)}
              {tab.value === "ALL" ? (
                <span className={cn("ms-1.5 opacity-70 tabular-nums")}>{total}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Ownership + priority chips */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {!hideOwnershipFilter && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground me-0.5">{t("Owner:")}</span>
            {(
              [
                { value: "all", label: "All" },
                { value: "mine", label: "Mine" },
                { value: "unassigned", label: "Unassigned" },
              ] as const
            ).map((f) => {
              const active = filters.ownership === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilters({ ownership: f.value, page: 1 })}
                  className={cn(
                    "inline-flex h-6 items-center rounded-full border px-2.5 text-[11px] font-medium transition-colors",
                    active
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                  )}
                >
                  {t(f.label)}
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => setFilters({ highPriority: !filters.highPriority, page: 1 })}
          className={cn(
            "inline-flex h-6 items-center gap-1 rounded-full border px-2.5 text-[11px] font-medium transition-colors",
            filters.highPriority
              ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
              : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
          )}
        >
          <Star className={cn("size-3", filters.highPriority && "fill-amber-500 text-amber-500")} />
          {t("High priority")}
        </button>
      </div>

      {/* Follow-up filter chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground me-0.5">{t("Follow-up:")}</span>
        {(
          [
            { value: "ALL", label: "All" },
            { value: "needs-followup", label: "Needs follow-up" },
            { value: "overdue", label: "Overdue" },
            { value: "due-today", label: "Due today" },
          ] as const
        ).map((f) => {
          const active = filters.followUp === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilters({ followUp: f.value, page: 1 })}
              className={cn(
                "inline-flex h-6 items-center rounded-full border px-2.5 text-[11px] font-medium transition-colors",
                active && f.value === "overdue"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : active && f.value === "due-today"
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : active
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              {t(f.label)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
