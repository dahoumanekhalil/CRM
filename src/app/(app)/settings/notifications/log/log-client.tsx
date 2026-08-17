"use client";

import * as React from "react";
import { parseAsString, parseAsInteger, useQueryStates } from "nuqs";
import { format, parseISO } from "date-fns";
import { ChevronDown, AlertCircle, Info, Bell, ExternalLink, Clock, Radio } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/primitives/status-badge";
import { EmptyState } from "@/components/primitives/empty-state";
import { cn } from "@/lib/utils";
import type { LogResult, LogRow } from "./actions";

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  "task.reminder": "Task Reminder",
  "task.overdue": "Overdue Alert",
  "task.assigned": "Task Assigned",
  "session.reminder": "Session Reminder",
  "session.nearCapacity": "Near Capacity",
  "payment.pending": "Payment Pending",
  "lead.assigned": "Lead Assigned",
  "daily.digest": "Daily Digest",
  "course.update": "Course Update",
};

const CHANNEL_LABELS: Record<string, string> = {
  telegram: "Telegram",
  inapp: "In-App",
  all: "All",
};

const STATUS_TONE: Record<
  string,
  "neutral" | "warning" | "info" | "success" | "danger" | "brand"
> = {
  PENDING: "warning",
  PROCESSING: "brand",
  SENT: "success",
  FAILED: "danger",
  CANCELLED: "neutral",
};

function friendlyReason(raw: string): string {
  const r = raw.toLowerCase();
  if (r.includes("no longer exists") || r.includes("not found"))
    return "Recipient no longer exists in the system.";
  if (r.includes("telegram_bot_token") || r.includes("bot token"))
    return "Telegram bot is not configured. Contact your administrator.";
  if (r.includes("unauthorized") || r.includes("401"))
    return "Telegram API authorization failed. The bot token may be invalid.";
  if (r.includes("too many requests") || r.includes("429"))
    return "Telegram rate limit reached. The message will be retried shortly.";
  if (r.includes("etimedout") || r.includes("timeout"))
    return "Network timeout reaching Telegram. Check your server's internet access.";
  if (r.includes("econnrefused") || r.includes("enotfound") || r.includes("network"))
    return "Network error connecting to Telegram. Check your server's internet access.";
  return "An unexpected error occurred during delivery.";
}

// Returns an in-app URL for the entity, or null if no direct-link page exists.
function buildEntityUrl(entityType: string | null, entityId: string | null): string | null {
  if (!entityType || !entityId) return null;
  // Synthetic IDs (e.g. "digest:2024-01-01", "overdue:2024-01-01") have no page.
  if (entityId.includes(":")) return null;
  switch (entityType) {
    case "Lead":    return `/leads/${entityId}`;
    case "Student": return `/students/${entityId}`;
    case "Task":    return `/tasks`;
    case "Payment": return `/payments`;
    case "Session": return `/sessions`;
    default:        return null;
  }
}

const PROVIDER_LABELS: Record<string, string> = {
  telegram: "Telegram only",
  inapp:    "In-app only",
  all:      "Telegram + In-app",
};

// ── Row expand ────────────────────────────────────────────────────────────────

function RowExpand({ row }: { row: LogRow }) {
  const [showDetails, setShowDetails] = React.useState(false);
  const entityUrl = buildEntityUrl(row.entityType, row.entityId);

  return (
    <div className="space-y-4 py-1">
      {/* Top row: payload + failure side by side */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Left — Payload preview */}
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Payload Preview
          </p>
          <div className="rounded-md border border-border/50 bg-card px-3 py-2.5 text-sm">
            {row.payloadTitle ? (
              <p className="font-medium text-foreground/90">{row.payloadTitle}</p>
            ) : null}
            {row.payloadBody ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{row.payloadBody}</p>
            ) : null}
            {!row.payloadTitle && !row.payloadBody ? (
              <p className="text-xs italic text-muted-foreground">No preview available.</p>
            ) : null}
          </div>
        </div>

        {/* Right — Failure reason */}
        <div>
          {row.failureReason ? (
            <>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Failure Reason
              </p>
              <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-px size-4 shrink-0 text-destructive" />
                  <p className="text-sm text-foreground/90">
                    {friendlyReason(row.failureReason)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDetails((v) => !v)}
                className="mt-2 flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <Info className="size-3" />
                {showDetails ? "Hide technical details" : "Technical details"}
              </button>
              {showDetails ? (
                <pre className="mt-2 max-h-32 overflow-auto rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                  {row.failureReason}
                </pre>
              ) : null}
            </>
          ) : row.status === "SENT" ? (
            <div className="flex h-full items-center">
              <p className="text-xs text-muted-foreground">Delivered successfully.</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Bottom row: metadata strip */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border/40 pt-3">
        {/* Retry history */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5 shrink-0" />
          {row.attemptCount === 0 ? (
            <span>Not yet attempted</span>
          ) : (
            <span>
              {row.attemptCount} attempt{row.attemptCount !== 1 ? "s" : ""} of 3
              {row.lastAttemptAt ? (
                <> &mdash; last at {format(parseISO(row.lastAttemptAt), "MMM d, HH:mm")}</>
              ) : null}
            </span>
          )}
        </div>

        {/* Provider */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Radio className="size-3.5 shrink-0" />
          <span>{PROVIDER_LABELS[row.provider] ?? row.provider}</span>
        </div>

        {/* Entity link */}
        {entityUrl ? (
          <a
            href={entityUrl}
            className="ms-auto flex items-center gap-1 text-xs font-medium text-primary transition-opacity hover:opacity-70"
          >
            View {row.entityType}
            <ExternalLink className="size-3" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function LogClient({ initialData }: { initialData: LogResult }) {
  const [filters, setFilters] = useQueryStates({
    status: parseAsString.withDefault(""),
    recipient: parseAsString.withDefault(""),
    from: parseAsString.withDefault(""),
    to: parseAsString.withDefault(""),
    page: parseAsInteger.withDefault(1),
  });

  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const { rows, total, page, pageSize } = initialData;
  const totalPages = Math.ceil(total / pageSize);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={filters.status || "ALL"}
          onValueChange={(v) => setFilters({ status: v === "ALL" ? "" : v, page: 1 })}
        >
          <SelectTrigger aria-label="Filter by delivery status" className="h-8 w-40 text-xs">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PROCESSING">Processing</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Input
          aria-label="Search by recipient name or email"
          placeholder="Search recipient…"
          value={filters.recipient}
          onChange={(e) => setFilters({ recipient: e.target.value, page: 1 })}
          className="h-8 w-48 text-xs"
        />

        <div className="flex items-center gap-1.5">
          <Input
            aria-label="From date"
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ from: e.target.value, page: 1 })}
            className="h-8 w-36 text-xs"
          />
          <span className="text-xs text-muted-foreground" aria-hidden="true">–</span>
          <Input
            aria-label="To date"
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ to: e.target.value, page: 1 })}
            className="h-8 w-36 text-xs"
          />
        </div>

        <span className="ms-auto text-xs text-muted-foreground">
          {total.toLocaleString()} record{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border/70 bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/70 bg-muted/40">
              {["Type", "Recipient", "Channel", "Scheduled", "Sent", "Status", "Entity", ""].map(
                (h) => (
                  <th
                    key={h}
                    scope="col"
                    className="h-11 px-4 text-start text-xs font-medium uppercase tracking-wider text-muted-foreground first:ps-4 last:w-8 last:px-2"
                  >
                    {h === "" ? <span className="sr-only">Expand</span> : h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-0">
                  <EmptyState
                    icon={Bell}
                    title="No delivery records"
                    description="Records will appear here once the notification cron job has run."
                    className="rounded-none border-none"
                  />
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <React.Fragment key={row.id}>
                  <tr
                    onClick={() => toggleExpand(row.id)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleExpand(row.id); } }}
                    tabIndex={0}
                    aria-expanded={expandedId === row.id}
                    className={cn(
                      "cursor-pointer border-b border-border/60 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                      expandedId === row.id && "bg-muted/20"
                    )}
                  >
                    {/* Type */}
                    <td className="px-4 py-3 font-medium text-foreground/90">
                      {TYPE_LABELS[row.type] ?? row.type}
                    </td>

                    {/* Recipient */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground/90">
                        {row.recipientName ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">{row.recipientEmail}</p>
                    </td>

                    {/* Channel */}
                    <td className="px-4 py-3 text-muted-foreground">
                      {CHANNEL_LABELS[row.provider] ?? row.provider}
                    </td>

                    {/* Scheduled */}
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {format(parseISO(row.scheduledAt), "MMM d, HH:mm")}
                    </td>

                    {/* Sent */}
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {row.sentAt ? format(parseISO(row.sentAt), "MMM d, HH:mm") : "—"}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} tone={STATUS_TONE[row.status]} />
                    </td>

                    {/* Entity */}
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {row.entityType ? (
                        <span>
                          {row.entityType}
                          {row.entityId ? (
                            <span className="ms-1 font-mono opacity-50">
                              {row.entityId.slice(0, 8)}…
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Expand toggle */}
                    <td className="px-2 py-3 text-center text-muted-foreground">
                      <button
                        type="button"
                        aria-label={expandedId === row.id ? "Collapse details" : "Expand details"}
                        aria-expanded={expandedId === row.id}
                        onClick={(e) => { e.stopPropagation(); toggleExpand(row.id); }}
                        className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <ChevronDown
                          className={cn(
                            "size-4 transition-transform duration-150",
                            expandedId === row.id && "rotate-180"
                          )}
                        />
                      </button>
                    </td>
                  </tr>

                  {expandedId === row.id ? (
                    <tr className="border-b border-border/60">
                      <td colSpan={8} className="bg-muted/10 px-6 py-4">
                        <RowExpand row={row} />
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setFilters({ page: page - 1 })}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setFilters({ page: page + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
