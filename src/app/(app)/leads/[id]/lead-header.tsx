import Link from "next/link";
import { BookOpen, Mail, Phone } from "lucide-react";
import { BackArrow } from "@/components/primitives/nav-arrow";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/primitives/status-badge";
import type { LeadDetail } from "../actions";
import { LeadHeaderActions } from "./lead-header-actions";
import type { SessionForConvert } from "@/components/shared/convert-lead-dialog";

function initials(first: string, last: string | null): string {
  const a = first?.[0] ?? "";
  const b = last?.[0] ?? "";
  return `${a}${b}`.toUpperCase() || "?";
}

export function LeadHeader({
  lead,
  sessionsForCourse,
}: {
  lead: LeadDetail;
  sessionsForCourse: SessionForConvert[];
}) {
  const fullName =
    [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unnamed lead";

  return (
    <header className="border-b border-border/60">
      <div className="border-b border-border/40 bg-muted/20 px-6 py-2">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-7 px-2 text-xs text-muted-foreground"
        >
          <Link href="/leads">
            <BackArrow className="size-3.5" /> All leads
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-6 px-6 py-6 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="grid size-16 shrink-0 place-items-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
            {initials(lead.firstName, lead.lastName)}
          </div>
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">
                {fullName}
              </h1>
              <StatusBadge status={lead.status} />
              {!lead.subscribed ? (
                <span
                  title="Unsubscribed — do not include in marketing campaigns"
                  className="inline-flex items-center rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground"
                >
                  Unsub
                </span>
              ) : null}
            </div>
            {lead.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {lead.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {lead.email ? (
                <a
                  href={`mailto:${lead.email}`}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  <Mail className="size-3" /> {lead.email}
                </a>
              ) : null}
              {lead.phone ? (
                <a
                  href={`tel:${lead.phone}`}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                  title="Tap to call"
                >
                  <Phone className="size-3" /> {lead.phone}
                </a>
              ) : null}
              {lead.course ? (
                <>
                  <span aria-hidden className="opacity-40">
                    ·
                  </span>
                  <Link
                    href={`/courses/${lead.course.slug}`}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <BookOpen className="size-3" /> {lead.course.name}
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <LeadHeaderActions lead={lead} sessionsForCourse={sessionsForCourse} />
      </div>
    </header>
  );
}
