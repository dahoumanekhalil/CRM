import Link from "next/link";
import { format } from "date-fns";
import { CalendarDays, ClipboardList, MapPin } from "lucide-react";

import { EmptyState } from "@/components/primitives/empty-state";
import { StatusBadge } from "@/components/primitives/status-badge";
import { getRegistrationsForStudent } from "@/app/(app)/registrations/actions";

export async function RegistrationsTab({ studentId }: { studentId: string }) {
  const rows = await getRegistrationsForStudent(studentId);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No registrations yet"
        description="Use the “Register for course” button above to book this student into a session."
      />
    );
  }

  return (
    <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card">
      {rows.map((r) => {
        const s = r.session;
        const dateLabel = format(s.startDate, "MMM d, yyyy");
        const timeLabel = `${format(s.startDate, "HH:mm")} – ${format(
          s.endDate,
          "HH:mm"
        )}`;
        const where = [s.city, s.country].filter(Boolean).join(", ") ||
          s.location ||
          null;
        return (
          <li
            key={r.id}
            className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md border border-border/70 bg-muted/40 text-muted-foreground">
                <CalendarDays className="size-4" />
              </span>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/courses/${s.course.slug}`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {s.course.name}
                    {s.title ? (
                      <span className="text-muted-foreground"> · {s.title}</span>
                    ) : null}
                  </Link>
                  <StatusBadge status={r.status} />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="tabular-nums">{dateLabel}</span>
                  <span aria-hidden className="opacity-40">
                    ·
                  </span>
                  <span className="tabular-nums">{timeLabel}</span>
                  {where ? (
                    <>
                      <span aria-hidden className="opacity-40">
                        ·
                      </span>
                      <span className="inline-flex items-center gap-1 truncate">
                        <MapPin className="size-3" /> {where}
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="text-end text-xs tabular-nums text-muted-foreground">
              Registered {format(r.registeredAt, "MMM d, yyyy")}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
