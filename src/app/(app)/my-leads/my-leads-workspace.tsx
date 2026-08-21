"use client";

import * as React from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock,
  Phone,
  Star,
  Users2,
} from "lucide-react";

import { StatusBadge } from "@/components/primitives/status-badge";
import { cn } from "@/lib/utils";
import { markLeadViewed } from "./actions";
import type { MyLeadsWorkspace } from "./actions";

// ── Lead card ──────────────────────────────────────────────────────────────────

// A lead is "new" if it was assigned within 24 h and has never been opened by the owner.
function isNewLead(lead: MyLeadsWorkspace["overdue"][number]): boolean {
  if (!lead.assignedAt) return false;
  const age = Date.now() - new Date(lead.assignedAt).getTime();
  return age < 86_400_000; // 24 h
}

function LeadCard({
  lead,
  timeLabel,
  timeTone = "neutral",
  showNewBadge = false,
}: {
  lead: MyLeadsWorkspace["overdue"][number];
  timeLabel?: string;
  timeTone?: "danger" | "warning" | "neutral";
  showNewBadge?: boolean;
}) {
  const fullName =
    [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unnamed lead";

  return (
    <Link
      href={`/leads/${lead.id}`}
      onClick={() => { void markLeadViewed(lead.id); }}
      className="block rounded-lg border border-border/60 bg-card px-4 py-3 hover:border-primary/30 hover:bg-muted/30 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            {lead.isHighPriority ? (
              <Star className="size-3.5 shrink-0 fill-warning text-warning" />
            ) : null}
            <span className="text-sm font-medium truncate">{fullName}</span>
            <StatusBadge status={lead.status} />
            {showNewBadge ? (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground leading-none">
                New
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {lead.phone ? (
              <a
                href={`tel:${lead.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 hover:text-foreground"
              >
                <Phone className="size-3" />
                {lead.phone}
              </a>
            ) : null}
            {lead.course ? (
              <span className="flex items-center gap-1">
                <BookOpen className="size-3" />
                {lead.course.name}
              </span>
            ) : null}
          </div>

          {lead.nextAction ? (
            <p className="text-xs text-muted-foreground line-clamp-1">
              <Clock className="inline size-3 me-1" />
              {lead.nextAction}
            </p>
          ) : null}
        </div>

        {timeLabel ? (
          <span
            className={cn(
              "shrink-0 text-[11px] font-medium",
              timeTone === "danger" && "text-destructive",
              timeTone === "warning" && "text-warning",
              timeTone === "neutral" && "text-muted-foreground"
            )}
          >
            {timeLabel}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

// ── Collapsible zone ───────────────────────────────────────────────────────────

function Zone({
  id,
  icon,
  title,
  count,
  tone = "neutral",
  emptyMessage,
  children,
  defaultOpen = true,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  count: number;
  tone?: "danger" | "warning" | "success" | "neutral";
  emptyMessage: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <section className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 text-start"
      >
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded",
            tone === "danger" && "text-destructive",
            tone === "warning" && "text-warning",
            tone === "success" && "text-success",
            tone === "neutral" && "text-muted-foreground"
          )}
        >
          {icon}
        </span>
        <span className="text-sm font-semibold tracking-tight">{title}</span>
        {count > 0 ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
              tone === "danger" && "bg-destructive/10 text-destructive",
              tone === "warning" && "bg-warning/10 text-warning",
              tone === "success" && "bg-success/10 text-success",
              tone === "neutral" && "bg-muted text-muted-foreground"
            )}
          >
            {count}
          </span>
        ) : (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">0</span>
        )}
        <span className="ms-auto text-muted-foreground">
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </span>
      </button>

      {open ? (
        <div className="space-y-2 ps-7">
          {count === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            children
          )}
        </div>
      ) : null}
    </section>
  );
}

// ── Pipeline status row ────────────────────────────────────────────────────────

const PIPELINE_STAGES: Array<{ key: string; label: string }> = [
  { key: "CONTACTED", label: "Contacted" },
  { key: "INTERESTED", label: "Interested" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "REGISTERED", label: "Registered" },
];

// ── Main workspace component ───────────────────────────────────────────────────

export function MyLeadsWorkspace({
  workspace,
}: {
  workspace: MyLeadsWorkspace;
}) {
  const { overdue, dueToday, newLeads, pipelineCounts, totalActive } = workspace;
  const todayCount = overdue.length + dueToday.length;

  return (
    <div className="space-y-8">
      {/* Zone 1 — TODAY */}
      <Zone
        id="today"
        icon={<AlertCircle className="size-4" />}
        title="Today"
        count={todayCount}
        tone={overdue.length > 0 ? "danger" : "warning"}
        emptyMessage="No follow-ups due — you're all caught up."
        defaultOpen={todayCount > 0}
      >
        {overdue.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-destructive/70">
              Overdue
            </p>
            {overdue.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                timeLabel={
                  lead.nextActionDue
                    ? formatDistanceToNow(new Date(lead.nextActionDue), { addSuffix: true })
                    : undefined
                }
                timeTone="danger"
              />
            ))}
          </div>
        ) : null}

        {dueToday.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-warning/70">
              Due today
            </p>
            {dueToday.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                timeLabel={
                  lead.nextActionDue
                    ? format(new Date(lead.nextActionDue), "h:mm a")
                    : "Today"
                }
                timeTone="warning"
              />
            ))}
          </div>
        ) : null}
      </Zone>

      {/* Zone 2 — NEW LEADS */}
      <Zone
        id="new"
        icon={<Star className="size-4" />}
        title="New Leads"
        count={newLeads.length}
        tone="warning"
        emptyMessage="No new leads assigned yet."
        defaultOpen={newLeads.length > 0}
      >
        {newLeads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            timeLabel={formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
            timeTone="neutral"
            showNewBadge={isNewLead(lead)}
          />
        ))}
      </Zone>

      {/* Zone 3 — PIPELINE */}
      <Zone
        id="pipeline"
        icon={<Users2 className="size-4" />}
        title="Pipeline"
        count={totalActive}
        tone="neutral"
        emptyMessage="No active leads in the pipeline."
        defaultOpen
      >
        <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
          {PIPELINE_STAGES.map((stage, i) => {
            const count = pipelineCounts[stage.key] ?? 0;
            return (
              <Link
                key={stage.key}
                href={`/my-leads?status=${stage.key}`}
                className={cn(
                  "flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors",
                  i > 0 && "border-t border-border/40"
                )}
              >
                <div className="flex items-center gap-2">
                  <StatusBadge status={stage.key} />
                </div>
                <span className="text-sm tabular-nums font-medium">{count}</span>
              </Link>
            );
          })}
        </div>
        <Link
          href="/my-leads?view=table"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          View all as table <ChevronRight className="size-3" />
        </Link>
      </Zone>
    </div>
  );
}
