import { prisma } from "@/lib/prisma";
import {
  getSessionsForCourse,
  listCoursesForFilter,
  listInstructorsForFilter,
} from "../../sessions/actions";
import { CourseSessionsTabClient } from "./sessions-tab-client";

export async function SessionsTab({
  courseId,
  courseSlug,
  courseName,
}: {
  courseId: string;
  courseSlug: string;
  courseName: string;
}) {
  const [sessions, courses, instructors, students] = await Promise.all([
    getSessionsForCourse(courseId),
    listCoursesForFilter(),
    listInstructorsForFilter(),
    prisma.student.findMany({
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      take: 500,
    }),
  ]);
  return (
    <CourseSessionsTabClient
      courseId={courseId}
      courseSlug={courseSlug}
      courseName={courseName}
      sessions={sessions}
      courses={courses}
      instructors={instructors}
      students={students}
    />
  );
}
