import { Pencil, Phone, Sparkles, UserCheck } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import type { LeadDetail } from "../actions";

interface ActivityEvent {
  id: string;
  when: Date;
  icon: typeof Sparkles;
  title: string;
  detail?: string;
}

export function ActivityTab({ lead }: { lead: LeadDetail }) {
  const events: ActivityEvent[] = [
    {
      id: "created",
      when: lead.createdAt,
      icon: Sparkles,
      title: "Lead captured",
      detail: lead.source ?? undefined,
    },
  ];

  if (lead.updatedAt.getTime() !== lead.createdAt.getTime()) {
    events.push({
      id: "updated",
      when: lead.updatedAt,
      icon: Pencil,
      title: "Details updated",
    });
  }

  if (lead.lastContactedAt) {
    events.push({
      id: "contacted",
      when: lead.lastContactedAt,
      icon: Phone,
      title: "Last contacted",
    });
  }

  if (lead.student) {
    events.push({
      id: "converted",
      when: lead.updatedAt,
      icon: UserCheck,
      title: "Converted to student",
      detail:
        [lead.student.firstName, lead.student.lastName]
          .filter(Boolean)
          .join(" ") || undefined,
    });
  }

  const sorted = events.sort((a, b) => b.when.getTime() - a.when.getTime());

  return (
    <ol className="relative space-y-4 border-s border-border/60 ps-6">
      {sorted.map((e) => {
        const Icon = e.icon;
        return (
          <li key={e.id} className="relative">
            <span
              aria-hidden
              className="absolute -start-[27px] top-1 grid size-5 place-items-center rounded-full border border-border bg-background text-muted-foreground"
            >
              <Icon className="size-3" />
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{e.title}</span>
              <span
                className="text-xs text-muted-foreground"
                title={format(e.when, "PPpp")}
              >
                {formatDistanceToNow(e.when, { addSuffix: true })}
              </span>
              {e.detail ? (
                <p className="mt-1 text-sm text-muted-foreground">{e.detail}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
