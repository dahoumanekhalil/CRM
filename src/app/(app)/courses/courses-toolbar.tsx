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
import { useT } from "@/lib/i18n/use-t";

import { courseFilters } from "./courses-filters";
import { COURSE_LEVELS, COURSE_STATUSES } from "@/lib/schemas/course";

const humanize = (s: string) =>
  s
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

const STATUS_TABS = [
  { value: "ALL" as const, label: "All" },
  ...COURSE_STATUSES.map((s) => ({ value: s, label: humanize(s) })),
];

export function CoursesToolbar({
  total,
  onNewCourse,
}: {
  total: number;
  onNewCourse: () => void;
}) {
  const t = useT();
  const [filters, setFilters] = useQueryStates(courseFilters);

  const hasActiveFilters =
    filters.q !== "" || filters.status !== "ALL" || filters.level !== "ALL";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2 sm:max-w-lg">
          <SearchInput
            containerClassName="flex-1"
            value={filters.q}
            onChange={(v) => setFilters({ q: v, page: 1 })}
            placeholder={t("Search courses by name, category…")}
          />
          <Select
            value={filters.level}
            onValueChange={(v) =>
              setFilters({
                level: v as (typeof COURSE_LEVELS)[number] | "ALL",
                page: 1,
              })
            }
          >
            <SelectTrigger size="sm" className="h-9 w-[140px] shrink-0">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("All levels")}</SelectItem>
              {COURSE_LEVELS.map((l) => (
                <SelectItem key={l} value={l}>
                  {t(humanize(l))}
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
                setFilters({ q: "", status: "ALL", level: "ALL", page: 1 })
              }
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" /> {t("Clear")}
            </Button>
          ) : null}
          <Button onClick={onNewCourse} size="sm">
            <Plus /> {t("New course")}
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
