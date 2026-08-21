"use client";

import * as React from "react";
import Link from "next/link";
import { useQueryStates } from "nuqs";
import { format } from "date-fns";
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  Clock,
  Globe,
  MapPin,
  Plus,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/use-t";
import { StatusBadge } from "@/components/primitives/status-badge";
import { EmptyState } from "@/components/primitives/empty-state";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/tables/data-table-pagination";

import { courseFilters } from "./courses-filters";
import type { CourseRow } from "./actions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(amount: unknown, currency: string) {
  if (amount == null) return null;
  const n = typeof amount === "object" ? Number(amount!.toString()) : Number(amount);
  if (!Number.isFinite(n) || n === 0) return null;
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

const LEVEL_LABEL: Record<string, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  ALL_LEVELS: "All levels",
};

const CATEGORY_COLORS: Record<string, string> = {
  default: "bg-primary/8 text-primary",
};

function categoryColor(category: string | null): string {
  if (!category) return CATEGORY_COLORS.default;
  const key = category.toLowerCase();
  const map: Record<string, string> = {
    security: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
    finance: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    marketing: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
    technology: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
    leadership: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    design: "bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400",
    data: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400",
  };
  return Object.entries(map).find(([k]) => key.includes(k))?.[1] ?? CATEGORY_COLORS.default;
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function CourseCard({ row }: { row: CourseRow }) {
  const t = useT();
  const nextSession = row.sessions?.[0] ?? null;
  const price = formatPrice(row.basePrice, row.currency);
  const catColor = categoryColor(row.category);

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card transition-all hover:border-border hover:shadow-sm">
      {/* Clickable body */}
      <Link href={`/courses/${row.slug}?tab=sessions`} className="flex flex-1 flex-col">
        {/* Card header */}
        <div className="flex items-start gap-3 p-4 pb-3">
          <span className={cn(
            "mt-0.5 grid size-10 shrink-0 place-items-center rounded-lg text-sm font-bold",
            catColor
          )}>
            <BookOpen className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate text-sm font-semibold leading-tight group-hover:text-primary transition-colors">
                {row.name}
              </h3>
              <StatusBadge status={row.status} className="shrink-0" />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {row.category && (
                <span className={cn(
                  "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
                  catColor
                )}>
                  {row.category}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground">
                {t(LEVEL_LABEL[row.level] ?? row.level)}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        {row.summary && (
          <p className="px-4 pb-3 text-xs leading-relaxed text-muted-foreground line-clamp-2">
            {row.summary}
          </p>
        )}

        {/* Divider */}
        <div className="mx-4 border-t border-border/50" />

        {/* Stats */}
        <div className="flex items-center gap-4 px-4 py-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5 text-primary/60" />
            <span>
              <span className="font-medium text-foreground">{row._count.sessions}</span>{" "}
              {row._count.sessions === 1 ? t("run") : t("runs")}
            </span>
          </span>
          {nextSession && (
            <span className="inline-flex items-center gap-1.5 truncate">
              <Clock className="size-3.5 shrink-0 text-primary/60" />
              <span className="truncate">
                {t("Next:")}
                <span className="font-medium text-foreground">
                  {format(nextSession.startDate, "MMM d, yyyy")}
                </span>
                {nextSession.city && (
                  <span className="hidden sm:inline text-muted-foreground">
                    {" · "}
                    <MapPin className="inline size-2.5" /> {nextSession.city}
                  </span>
                )}
              </span>
            </span>
          )}
          {nextSession && (
            <span className="ms-auto inline-flex items-center gap-1 shrink-0">
              <Users className="size-3.5 text-primary/60" />
              <span className="font-medium text-foreground">
                {nextSession._count.registrations}
              </span>{" "}
              {t("enrolled")}
            </span>
          )}
        </div>

        {/* Price row */}
        <div className="mt-auto flex items-center justify-between border-t border-border/50 px-4 py-2.5">
          {price ? (
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {price}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">{t("No price set")}</span>
          )}
          <span className="inline-flex items-center gap-0.5 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            View runs <ChevronRight className="size-3.5" />
          </span>
        </div>
      </Link>

      {/* Quick actions — separate from the link */}
      <div className="flex items-center gap-1.5 border-t border-border/50 bg-muted/20 px-3 py-2">
        <Link
          href={`/courses/${row.slug}?tab=sessions&new=1`}
          className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Plus className="size-3" />
          {t("New run")}
        </Link>
        <Link
          href={`/courses/${row.slug}?tab=landing`}
          className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Globe className="size-3" />
          {t("Landing page")}
        </Link>
      </div>
    </div>
  );
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

export function CoursesGrid({
  rows,
  total,
  onNewCourse,
}: {
  rows: CourseRow[];
  total: number;
  onNewCourse: () => void;
}) {
  const t = useT();
  const [filters, setFilters] = useQueryStates(courseFilters);

  const emptyState =
    filters.q || filters.status !== "ALL" || filters.level !== "ALL" ? (
      <EmptyState
        icon={BookOpen}
        title={t("No courses match your filters")}
        description={t("Try clearing filters or searching for something else.")}
        action={
          <Button
            variant="outline"
            onClick={() => setFilters({ q: "", status: "ALL", level: "ALL", page: 1 })}
          >
            {t("Clear filters")}
          </Button>
        }
        className="border-0 bg-transparent py-16"
      />
    ) : (
      <EmptyState
        icon={BookOpen}
        title={t("No courses yet")}
        description={t("Create your first course to start scheduling sessions.")}
        action={<Button onClick={onNewCourse}>{t("Create your first course")}</Button>}
        className="border-0 bg-transparent py-16"
      />
    );

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        emptyState
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <CourseCard key={row.id} row={row} />
          ))}
        </div>
      )}
      <DataTablePagination
        page={filters.page}
        pageSize={filters.pageSize}
        totalItems={total}
        onPageChange={(p) => setFilters({ page: p })}
        onPageSizeChange={(s) => setFilters({ pageSize: s, page: 1 })}
        selectedCount={0}
      />
    </div>
  );
}
