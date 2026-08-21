import { PageHeader } from "@/components/primitives/page-header";
import { prisma } from "@/lib/prisma";
import {
  listCoursesForFilter,
  listInstructorsForFilter,
  listSessions,
} from "./actions";
import { listSessionsSchema } from "@/lib/schemas/session";
import { SessionsClient } from "./sessions-client";

export const metadata = { title: "Course Runs" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readString(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const parsed = listSessionsSchema.parse({
    q: readString(params.q),
    status: readString(params.status),
    courseId: readString(params.courseId),
    when: readString(params.when),
    page: readString(params.page),
    pageSize: readString(params.pageSize),
    sortBy: readString(params.sortBy),
    sortDir: readString(params.sortDir),
  });

  const [{ rows, total }, courses, instructors, students] = await Promise.all([
    listSessions(parsed),
    listCoursesForFilter(),
    listInstructorsForFilter(),
    prisma.student.findMany({
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      take: 500,
    }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Course Runs"
        title="All course runs"
        description="Scheduled cohorts of your courses — dates, locations, capacity."
      />
      <div className="flex-1 space-y-4 p-6">
        <SessionsClient
          rows={rows}
          total={total}
          courses={courses}
          instructors={instructors}
          students={students}
        />
      </div>
    </>
  );
}
