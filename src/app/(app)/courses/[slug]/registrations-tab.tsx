import Link from "next/link";
import { format } from "date-fns";
import { CalendarDays, ClipboardList, GraduationCap } from "lucide-react";

import { EmptyState } from "@/components/primitives/empty-state";
import { StatusBadge } from "@/components/primitives/status-badge";
import { getRegistrationsForCourse } from "@/app/(app)/registrations/actions";

export async function RegistrationsTab({ courseId }: { courseId: string }) {
  const rows = await getRegistrationsForCourse(courseId);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No registrations yet"
        description="Registrations appear here once a student books a session. Register someone from the Sessions tab or directly from their profile."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
      <header className="border-b border-border/60 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">
          Registrations across all sessions
        </h2>
        <p className="text-xs text-muted-foreground">
          {rows.length} {rows.length === 1 ? "registration" : "registrations"} · newest first
        </p>
      </header>
      <ul className="divide-y divide-border/60">
        {rows.map((r) => {
          const studentName =
            [r.student.firstName, r.student.lastName]
              .filter(Boolean)
              .join(" ") ||
            r.student.email ||
            "Unnamed student";
          return (
            <li key={r.id} className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  <GraduationCap className="size-4" />
                </span>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/students/${r.student.id}`}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {studentName}
                    </Link>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 truncate">
                      <CalendarDays className="size-3" />
                      {format(r.session.startDate, "MMM d, yyyy")}
                    </span>
                    {r.session.title ? (
                      <>
                        <span aria-hidden className="opacity-40">
                          ·
                        </span>
                        <span className="truncate">{r.session.title}</span>
                      </>
                    ) : null}
                    {r.session.city ? (
                      <>
                        <span aria-hidden className="opacity-40">
                          ·
                        </span>
                        <span>{r.session.city}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="text-end text-xs tabular-nums text-muted-foreground">
                {format(r.registeredAt, "MMM d, yyyy")}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
