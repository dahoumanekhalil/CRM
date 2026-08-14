import { Pencil, Sparkles } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import type { StudentDetail } from "../actions";

interface ActivityEvent {
  id: string;
  when: Date;
  icon: typeof Sparkles;
  title: string;
  detail?: string;
}

export function ActivityTab({ student }: { student: StudentDetail }) {
  // v1: derive activity from Student fields until Communications / Registrations
  // events are wired. Cheap, honest, and something for the tab to show.
  const events: ActivityEvent[] = [
    {
      id: "created",
      when: student.createdAt,
      icon: Sparkles,
      title: "Added to the CRM",
    },
  ];
  if (student.updatedAt.getTime() !== student.createdAt.getTime()) {
    events.push({
      id: "updated",
      when: student.updatedAt,
      icon: Pencil,
      title: "Profile updated",
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
