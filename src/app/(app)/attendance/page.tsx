import { PageHeader } from "@/components/primitives/page-header";
import { listAttendanceSchema } from "@/lib/schemas/attendance";
import {
  listCoursesForAttendanceFilter,
  listSessionsForAttendance,
} from "./actions";
import { AttendanceClient } from "./attendance-client";

export const metadata = { title: "Attendance" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const readString = (v: string | string[] | undefined) =>
  typeof v === "string" ? v : undefined;

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const parsed = listAttendanceSchema.parse({
    q: readString(params.q),
    courseId: readString(params.courseId),
    when: readString(params.when),
  });

  const [rows, courses] = await Promise.all([
    listSessionsForAttendance(parsed),
    listCoursesForAttendanceFilter(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Attendance"
        description="Take attendance for today's sessions, catch up on past ones, or scan what's coming."
      />
      <div className="flex-1 space-y-4 p-6">
        <AttendanceClient rows={rows} courses={courses} />
      </div>
    </>
  );
}
