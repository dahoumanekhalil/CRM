"use client";

import * as React from "react";
import Link from "next/link";
import { useQueryStates } from "nuqs";
import { ListFilter, MapPin, Plus, Star, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/primitives/search-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { VISIBLE_LEAD_STATUSES, LEAD_CALL_TIME_FILTERS } from "@/lib/schemas/lead";
import type { LeadCoursePickerItem } from "./actions";
import { exportLeadsCsv } from "./export";
import { CsvExportButton } from "@/components/primitives/csv-export-button";
import { ViewSwitcher, type LeadsView } from "./view-switcher";
import { ColumnVisibilityMenu } from "@/components/tables/column-visibility-menu";
import { LEADS_COLUMN_DEFS } from "./leads-view-constants";

// ─── Constants ────────────────────────────────────────────────────────────────

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

const OWNERSHIP_OPTIONS = [
  { value: "all", label: "All" },
  { value: "mine", label: "Mine" },
  { value: "unassigned", label: "Unassigned" },
] as const;

const FOLLOWUP_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "needs-followup", label: "Needs follow-up" },
  { value: "overdue", label: "Overdue" },
  { value: "due-today", label: "Due today" },
] as const;

const CALL_TIME_LABELS: Record<(typeof LEAD_CALL_TIME_FILTERS)[number], string> = {
  ALL: "All",
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  anytime: "Anytime",
};

// ─── City input (debounced) ───────────────────────────────────────────────────

// Types locally so the URL isn't rewritten on every keystroke, then commits
// after 300 ms of idle. Stays in sync when the URL is cleared externally.
function CityFilterInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const t = useT();
  const [local, setLocal] = React.useState(value);
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocal(value);
  }, [value]);
  React.useEffect(() => {
    if (local === value) return;
    const h = setTimeout(() => onChange(local), 300);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);
  return (
    <div className="relative w-full sm:w-[150px] sm:shrink-0">
      <MapPin className="pointer-events-none absolute inset-y-0 start-2.5 my-auto size-3.5 text-muted-foreground" />
      <Input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={t("City")}
        className="h-9 ps-8 text-xs"
        aria-label={t("Filter by city")}
      />
    </div>
  );
}

// ─── Filter option row (used inside the popover) ──────────────────────────────

function FilterChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  const t = useT();
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {t(label)}
      </div>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "inline-flex h-6 items-center rounded-full border px-2.5 text-[11px] font-medium transition-colors",
                active
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {t(opt.label)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

export function LeadsToolbar({
  total,
  onNewLead,
  courses,
  hideOwnershipFilter = false,
  view,
  onViewChange,
  columnVisibility,
  onColumnVisibilityChange,
  onResetColumns,
}: {
  total: number;
  onNewLead: () => void;
  courses: LeadCoursePickerItem[];
  hideOwnershipFilter?: boolean;
  view: LeadsView;
  onViewChange: (view: LeadsView) => void;
  columnVisibility: Record<string, boolean>;
  onColumnVisibilityChange: (id: string, visible: boolean) => void;
  onResetColumns: () => void;
}) {
  const t = useT();
  const [filters, setFilters] = useQueryStates(leadFilters);

  // Count only the "popover-hidden" filters — the inline ones (search, course,
  // city, status tab) advertise themselves already, so double-counting them on
  // the Filters trigger would confuse the badge.
  const popoverFilterCount =
    (filters.ownership !== "all" ? 1 : 0) +
    (filters.highPriority ? 1 : 0) +
    (filters.followUp !== "ALL" ? 1 : 0) +
    (filters.callTime !== "ALL" ? 1 : 0);

  const hasAnyFilter =
    filters.q !== "" ||
    filters.status !== "ALL" ||
    filters.courseId !== "" ||
    filters.city !== "" ||
    popoverFilterCount > 0;

  const clearAll = () =>
    setFilters({
      q: "",
      status: "ALL",
      courseId: "",
      followUp: "ALL",
      ownership: "all",
      highPriority: false,
      city: "",
      callTime: "ALL",
      page: 1,
    });

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1 — search + primary filters on the left, actions on the right */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          containerClassName="w-full sm:w-auto sm:flex-1 sm:min-w-[220px] sm:max-w-[360px]"
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
          <SelectTrigger size="sm" className="h-9 w-full sm:w-[160px] sm:shrink-0">
            <SelectValue placeholder={t("Course")} />
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
        <CityFilterInput
          value={filters.city}
          onChange={(v) => setFilters({ city: v, page: 1 })}
        />

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="relative">
              <ListFilter className="size-3.5" /> {t("Filters")}
              {popoverFilterCount > 0 ? (
                <span className="ms-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground tabular-nums">
                  {popoverFilterCount}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 space-y-4">
            {!hideOwnershipFilter ? (
              <FilterChipGroup
                label="Owner"
                options={OWNERSHIP_OPTIONS}
                value={filters.ownership}
                onChange={(v) => setFilters({ ownership: v, page: 1 })}
              />
            ) : null}

            <div className="space-y-1.5">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {t("Priority")}
              </div>
              <button
                type="button"
                onClick={() =>
                  setFilters({ highPriority: !filters.highPriority, page: 1 })
                }
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
                  filters.highPriority
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                <Star
                  className={cn(
                    "size-3.5",
                    filters.highPriority && "fill-amber-500 text-amber-500",
                  )}
                />
                {t("High priority only")}
              </button>
            </div>

            <FilterChipGroup
              label="Follow-up"
              options={FOLLOWUP_OPTIONS}
              value={filters.followUp}
              onChange={(v) => setFilters({ followUp: v, page: 1 })}
            />

            <FilterChipGroup
              label="Best time to call"
              options={LEAD_CALL_TIME_FILTERS.map((v) => ({
                value: v,
                label: CALL_TIME_LABELS[v],
              }))}
              value={filters.callTime}
              onChange={(v) => setFilters({ callTime: v, page: 1 })}
            />

            {hasAnyFilter ? (
              <div className="flex justify-end border-t border-border/60 pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" /> {t("Clear all filters")}
                </Button>
              </div>
            ) : null}
          </PopoverContent>
        </Popover>

        {/* Spacer — pushes action buttons to the end on wider screens. */}
        <div className="hidden sm:block sm:flex-1" />

        {view === "table" ? (
          <ColumnVisibilityMenu
            columns={LEADS_COLUMN_DEFS.map((c) => ({
              id: c.id,
              label: t(c.label),
              required: c.required,
            }))}
            visibility={columnVisibility}
            onChange={onColumnVisibilityChange}
            onReset={onResetColumns}
          />
        ) : null}
        <ViewSwitcher value={view} onChange={onViewChange} />
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

      {/* Row 2 — status tabs. Kept prominent because they're the primary
          segmentation employees use to slice the pipeline. */}
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
                  : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {t(tab.label)}
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
