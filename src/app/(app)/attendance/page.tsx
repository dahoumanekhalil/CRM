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

  // Always fetch today's sessions so they're pinned at the top regardless
  // of what filter the user has selected. When the filter IS "TODAY", rows
  // already contains today — pass an empty array to avoid duplication.
  const isViewingToday = parsed.when === "TODAY";
  const todayInput = listAttendanceSchema.parse({ q: "", courseId: "", when: "TODAY" });

  const [rows, courses, todayRows] = await Promise.all([
    listSessionsForAttendance(parsed),
    listCoursesForAttendanceFilter(),
    isViewingToday
      ? Promise.resolve([] as Awaited<ReturnType<typeof listSessionsForAttendance>>)
      : listSessionsForAttendance(todayInput),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Attendance"
        description="Take attendance for today's course runs, catch up on past ones, or scan what's coming."
      />
      <div className="flex-1 space-y-4 p-6">
        <AttendanceClient rows={rows} courses={courses} todayRows={todayRows} />
      </div>
    </>
  );
}
