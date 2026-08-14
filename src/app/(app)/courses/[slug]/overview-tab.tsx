import { formatDistanceToNow } from "date-fns";
import {
  Calendar,
  CalendarDays,
  ClipboardList,
  Clock,
  Globe,
  Tag,
  User,
} from "lucide-react";
import type { CourseDetail } from "../actions";

const humanize = (s: string) =>
  s
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

export function OverviewTab({ detail }: { detail: CourseDetail }) {
  const { course, registrations } = detail;
  const instructor = course.primaryInstructor;
  const createdBy = course.createdBy;

  const metrics = [
    {
      label: "Landing pages",
      value: course._count.landingPages,
      icon: Globe,
    },
    {
      label: "Sessions",
      value: course._count.sessions,
      icon: CalendarDays,
    },
    {
      label: "Registrations",
      value: registrations,
      icon: ClipboardList,
    },
  ];

  const facts: Array<{
    label: string;
    value: string;
    icon: typeof User;
  }> = [
    {
      label: "Primary instructor",
      value: instructor
        ? [instructor.firstName, instructor.lastName]
            .filter(Boolean)
            .join(" ") || "—"
        : "Unassigned",
      icon: User,
    },
    {
      label: "Level",
      value: humanize(course.level),
      icon: Tag,
    },
    {
      label: "Duration",
      value: course.durationHours ? `${course.durationHours} hours` : "—",
      icon: Clock,
    },
    {
      label: "Created",
      value: `${formatDistanceToNow(course.createdAt, { addSuffix: true })}${
        createdBy?.name ? ` by ${createdBy.name}` : ""
      }`,
      icon: Calendar,
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left / main */}
      <div className="space-y-4 lg:col-span-2">
        {/* Metrics row */}
        <section
          aria-label="Metrics"
          className="grid grid-cols-3 divide-x divide-border/60 rounded-xl border border-border/60 bg-card"
        >
          {metrics.map((m) => (
            <div key={m.label} className="flex flex-col gap-1.5 px-5 py-4">
              <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <m.icon className="size-3.5" /> {m.label}
              </span>
              <span className="text-2xl font-semibold tabular-nums">
                {m.value}
              </span>
            </div>
          ))}
        </section>

        {/* Description */}
        <section className="rounded-xl border border-border/60 bg-card p-6">
          <h2 className="mb-3 text-sm font-semibold tracking-tight">
            About this course
          </h2>
          {course.description ? (
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 dark:prose-invert">
              {course.description}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No description yet. Add one from the Edit sheet — it appears here
              and on the landing page.
            </p>
          )}
        </section>
      </div>

      {/* Right / facts */}
      <aside className="space-y-4">
        <section className="rounded-xl border border-border/60 bg-card">
          <header className="border-b border-border/60 px-5 py-3">
            <h2 className="text-sm font-semibold tracking-tight">Key facts</h2>
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
                <dd className="text-end text-sm font-medium">{f.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </aside>
    </div>
  );
}
