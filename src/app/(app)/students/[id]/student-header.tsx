import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { BackArrow } from "@/components/primitives/nav-arrow";
import { Button } from "@/components/ui/button";
import type { StudentDetail } from "../actions";
import { StudentHeaderActions } from "./student-header-actions";

function initials(first: string, last: string | null): string {
  const a = first?.[0] ?? "";
  const b = last?.[0] ?? "";
  return `${a}${b}`.toUpperCase() || "?";
}

interface SessionOption {
  id: string;
  title?: string | null;
  courseName: string;
  startDate: Date;
  endDate: Date;
  city?: string | null;
  seatsTaken: number;
  capacity: number;
}

export function StudentHeader({
  student,
  upcomingSessions,
}: {
  student: StudentDetail;
  upcomingSessions: SessionOption[];
}) {
  const fullName =
    [student.firstName, student.lastName].filter(Boolean).join(" ") ||
    "Unnamed";

  return (
    <header className="border-b border-border/60">
      <div className="border-b border-border/40 bg-muted/20 px-6 py-2">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-7 px-2 text-xs text-muted-foreground"
        >
          <Link href="/students">
            <BackArrow className="size-3.5" /> All students
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-6 px-6 py-6 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="grid size-16 shrink-0 place-items-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
            {initials(student.firstName, student.lastName)}
          </div>
          <div className="min-w-0 space-y-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">
              {fullName}
            </h1>
            {student.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {student.tags.map((t) => (
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
              {student.email ? (
                <a
                  href={`mailto:${student.email}`}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  <Mail className="size-3" /> {student.email}
                </a>
              ) : null}
              {student.phone ? (
                <a
                  href={`tel:${student.phone}`}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                  title="Tap to call"
                >
                  <Phone className="size-3" /> {student.phone}
                </a>
              ) : null}
              {student.address ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3" /> {student.address}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <StudentHeaderActions
          student={student}
          upcomingSessions={upcomingSessions}
        />
      </div>
    </header>
  );
}
