import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { BookOpen, Calendar, CalendarDays, Mail, MapPin, Megaphone, Phone, User } from "lucide-react";
import type { LeadDetail, SalesTeamMember, LeadAssignmentHistoryRow, LeadInterestedSession } from "../actions";
import { NextActionSection } from "./next-action-section";
import { QuickActionsRow } from "./quick-actions-row";
import { AssignLeadDialog } from "./assign-lead-dialog";
import { SessionSelectorDialog, RemoveSessionButton } from "./session-selector";
import { StatusBadge } from "@/components/primitives/status-badge";

type UserPickerItem = { id: string; name: string | null; email: string };

export function OverviewTab({
  lead,
  users,
  salesTeam = [],
  canAssign = false,
  assignmentHistory = [],
  interestedSession = null,
}: {
  lead: LeadDetail;
  users: UserPickerItem[];
  salesTeam?: SalesTeamMember[];
  canAssign?: boolean;
  assignmentHistory?: LeadAssignmentHistoryRow[];
  interestedSession?: LeadInterestedSession | null;
}) {
  const facts: Array<{
    label: string;
    value: React.ReactNode;
    icon: typeof Mail;
    action?: React.ReactNode;
  }> = [
    { label: "Email", value: lead.email ?? "—", icon: Mail },
    { label: "Phone", value: lead.phone ?? "—", icon: Phone },
    { label: "Source", value: lead.source ?? "—", icon: Megaphone },
    {
      label: "Interested in",
      value: lead.course ? (
        <Link
          href={`/courses/${lead.course.slug}`}
          className="hover:underline"
        >
          {lead.course.name}
        </Link>
      ) : (
        "—"
      ),
      icon: BookOpen,
    },
    {
      label: "Assigned to",
      value: lead.owner?.name ?? lead.owner?.email ?? "Unassigned",
      icon: User,
      action: canAssign ? (
        <AssignLeadDialog
          leadId={lead.id}
          currentOwnerId={lead.owner?.id ?? null}
          salesTeam={salesTeam}
        />
      ) : null,
    },
    {
      label: "Added",
      value: formatDistanceToNow(lead.createdAt, { addSuffix: true }),
      icon: Calendar,
    },
    {
      label: "Last contacted",
      value: lead.lastContactedAt
        ? formatDistanceToNow(lead.lastContactedAt, { addSuffix: true })
        : "Never",
      icon: Calendar,
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {/* Quick log shortcuts */}
        <QuickActionsRow leadId={lead.id} />

        {/* Next action — most important, shown first */}
        <NextActionSection lead={lead} users={users} />

        <section className="rounded-xl border border-border/60 bg-card p-6">
          <h2 className="mb-3 text-sm font-semibold tracking-tight">
            About this lead
          </h2>
          {lead.notes ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {lead.notes}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No notes yet. Add context from the Edit sheet — a good place to
              record what they said on the phone or in a demo.
            </p>
          )}
        </section>

        {/* Session interest — the session Sales has chosen for this lead */}
        <section className="rounded-xl border border-border/60 bg-card p-6">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-semibold tracking-tight flex items-center gap-1.5">
              <CalendarDays className="size-4 text-muted-foreground" />
              Course Session
            </h2>
            <SessionSelectorDialog
              leadId={lead.id}
              currentSessionId={interestedSession?.id ?? null}
              trigger={
                <button
                  type="button"
                  className="text-xs text-primary hover:underline font-medium"
                >
                  {interestedSession ? "Change session" : "Select session"}
                </button>
              }
            />
          </div>
          {interestedSession ? (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {interestedSession.course?.name ?? "Course"}
                    {interestedSession.title ? (
                      <span className="text-muted-foreground"> — {interestedSession.title}</span>
                    ) : null}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="size-3" />
                      {format(new Date(interestedSession.startDate), "d MMM yyyy")}
                    </span>
                    {interestedSession.city || interestedSession.location ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" />
                        {interestedSession.city ?? interestedSession.location}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={interestedSession.status} />
                  <RemoveSessionButton leadId={lead.id} />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No session selected yet. Contact the lead and choose a session date after discussing availability.
            </p>
          )}
        </section>

        {lead.student ? (
          <section className="rounded-xl border border-success/40 bg-success/5 p-6">
            <div className="flex items-center gap-3 text-sm">
              <span className="grid size-8 place-items-center rounded-full bg-success/15 text-success">
                <User className="size-4" />
              </span>
              <div>
                <div className="font-medium">Converted to student</div>
                <Link
                  href={`/students/${lead.student.id}`}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  {[lead.student.firstName, lead.student.lastName]
                    .filter(Boolean)
                    .join(" ") || "Unnamed student"}{" "}
                  · open profile
                </Link>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <aside className="space-y-4">
        {/* Assignment history — visible to managers */}
        {canAssign && assignmentHistory.length > 0 ? (
          <section className="rounded-xl border border-border/60 bg-card">
            <header className="border-b border-border/60 px-5 py-3">
              <h2 className="text-sm font-semibold tracking-tight">
                Assignment history
              </h2>
            </header>
            <ol className="divide-y divide-border/60">
              {assignmentHistory.map((h) => (
                <li key={h.id} className="px-5 py-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground/90">
                      {h.assignedTo?.name ?? h.assignedTo?.email ?? "Unassigned"}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {format(h.createdAt, "MMM d")}
                    </span>
                  </div>
                  <div className="mt-0.5 text-muted-foreground">
                    by {h.assignedBy.name ?? h.assignedBy.email}
                    {h.note ? (
                      <span className="mt-0.5 block italic">{h.note}</span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <section className="rounded-xl border border-border/60 bg-card">
          <header className="border-b border-border/60 px-5 py-3">
            <h2 className="text-sm font-semibold tracking-tight">Details</h2>
          </header>
          <dl className="divide-y divide-border/60">
            {facts.map((f) => (
              <div
                key={f.label}
                className="flex items-start justify-between gap-4 px-5 py-3"
              >
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <f.icon className="size-3.5" />
                  {f.label}
                </dt>
                <dd className="flex max-w-[60%] flex-col items-end gap-1">
                  <span className="truncate text-end text-sm font-medium">
                    {f.value}
                  </span>
                  {f.action ?? null}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </aside>
    </div>
  );
}
