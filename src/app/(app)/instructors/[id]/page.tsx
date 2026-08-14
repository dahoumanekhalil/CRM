import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, CalendarDays, Mail, Phone } from "lucide-react";
import type { Metadata } from "next";

import { StatusBadge } from "@/components/primitives/status-badge";
import { Button } from "@/components/ui/button";
import { getInstructorDetail } from "../actions";
import { EditInstructorButton } from "./edit-button";

type Params = Promise<{ id: string }>;

function initials(first: string, last: string | null): string {
  const a = first?.[0] ?? "";
  const b = last?.[0] ?? "";
  return `${a}${b}`.toUpperCase() || "?";
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const instructor = await getInstructorDetail(id);
  const name = instructor
    ? [instructor.firstName, instructor.lastName].filter(Boolean).join(" ")
    : "Instructor";
  return { title: name };
}

export default async function InstructorDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const instructor = await getInstructorDetail(id);
  if (!instructor) notFound();

  const name =
    [instructor.firstName, instructor.lastName].filter(Boolean).join(" ") ||
    "Unnamed";

  return (
    <div className="flex flex-col">
      <div className="border-b border-border/60 px-6 py-4">
        <Button variant="ghost" size="sm" asChild className="-ms-2 mb-4 text-muted-foreground">
          <Link href="/instructors">
            <ArrowLeft className="size-4" />
            Instructors
          </Link>
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid size-16 shrink-0 place-items-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
              {initials(instructor.firstName, instructor.lastName)}
            </span>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {instructor.email ? (
                  <span className="flex items-center gap-1.5">
                    <Mail className="size-3.5 shrink-0" />
                    {instructor.email}
                  </span>
                ) : null}
                {instructor.phone ? (
                  <span className="flex items-center gap-1.5">
                    <Phone className="size-3.5 shrink-0" />
                    {instructor.phone}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <EditInstructorButton instructor={instructor} />
        </div>
      </div>

      <div className="flex-1 space-y-8 p-6">
        {instructor.bio ? (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold tracking-tight text-muted-foreground uppercase">
              Bio
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-foreground/80">
              {instructor.bio}
            </p>
          </section>
        ) : null}

        {instructor.expertise && instructor.expertise.length > 0 ? (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold tracking-tight text-muted-foreground uppercase">
              Expertise
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {instructor.expertise.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-md border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground/80"
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                <BookOpen className="size-4 text-muted-foreground" />
                Courses
              </h2>
              <span className="text-xs tabular-nums text-muted-foreground">
                {instructor.courses.length}
              </span>
            </div>
            {instructor.courses.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/60 py-6 text-center text-sm text-muted-foreground">
                Not assigned to any courses yet.
              </p>
            ) : (
              <ul className="divide-y divide-border/50 rounded-lg border border-border/60">
                {instructor.courses.map((course) => (
                  <li key={course.id}>
                    <Link
                      href={`/courses/${course.slug}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                    >
                      <span className="truncate text-sm font-medium">
                        {course.name}
                      </span>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {course._count.sessions}{" "}
                          {course._count.sessions === 1 ? "session" : "sessions"}
                        </span>
                        <StatusBadge status={course.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                <CalendarDays className="size-4 text-muted-foreground" />
                Sessions
              </h2>
              <span className="text-xs tabular-nums text-muted-foreground">
                {instructor.sessions.length}
              </span>
            </div>
            {instructor.sessions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/60 py-6 text-center text-sm text-muted-foreground">
                No sessions assigned yet.
              </p>
            ) : (
              <ul className="divide-y divide-border/50 rounded-lg border border-border/60">
                {instructor.sessions.map((session) => (
                  <li key={session.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate text-sm font-medium">
                        {session.title ?? session.course.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.startDate.toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <StatusBadge status={session.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
