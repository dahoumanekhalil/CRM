import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { BookOpen, Contact, Mail, Phone } from "lucide-react";

import { EmptyState } from "@/components/primitives/empty-state";
import { StatusBadge } from "@/components/primitives/status-badge";
import type { CampaignLeadRow } from "../actions";

function initials(first: string, last: string | null): string {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

export function LeadsTab({ rows }: { rows: CampaignLeadRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Contact}
        title="No leads attributed to this campaign yet"
        description="Leads captured via a form (or manually attached) appear here."
      />
    );
  }

  return (
    <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card">
      {rows.map((lead) => {
        const name =
          [lead.firstName, lead.lastName].filter(Boolean).join(" ") ||
          "Unnamed lead";
        return (
          <li
            key={lead.id}
            className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {initials(lead.firstName, lead.lastName)}
              </span>
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {name}
                  </Link>
                  <StatusBadge status={lead.status} />
                  {lead.student ? (
                    <Link
                      href={`/students/${lead.student.id}`}
                      className="inline-flex items-center rounded-md border border-success/30 bg-success/10 px-1.5 py-0 text-[10px] text-success hover:bg-success/15"
                    >
                      Converted
                    </Link>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {lead.email ? (
                    <span className="inline-flex items-center gap-1 truncate">
                      <Mail className="size-3" /> {lead.email}
                    </span>
                  ) : null}
                  {lead.phone ? (
                    <span className="inline-flex items-center gap-1 truncate">
                      <Phone className="size-3" /> {lead.phone}
                    </span>
                  ) : null}
                  {lead.course ? (
                    <>
                      <span aria-hidden className="opacity-40">
                        ·
                      </span>
                      <Link
                        href={`/courses/${lead.course.slug}`}
                        className="inline-flex items-center gap-1 truncate hover:text-foreground"
                      >
                        <BookOpen className="size-3" /> {lead.course.name}
                      </Link>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="text-end text-xs tabular-nums text-muted-foreground">
              {formatDistanceToNow(lead.createdAt, { addSuffix: true })}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
