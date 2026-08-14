import { PageHeader } from "@/components/primitives/page-header";
import { listCourses } from "./actions";
import { listCoursesSchema } from "@/lib/schemas/course";
import { CoursesClient } from "./courses-client";

export const metadata = { title: "Courses" };

export default async function CoursesPage({
  searchParams,
}: PageProps<"/courses">) {
  const params = await searchParams;
  const parsed = listCoursesSchema.parse({
    q: typeof params.q === "string" ? params.q : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    level: typeof params.level === "string" ? params.level : undefined,
    page: typeof params.page === "string" ? params.page : undefined,
    pageSize: typeof params.pageSize === "string" ? params.pageSize : undefined,
    sortBy: typeof params.sortBy === "string" ? params.sortBy : undefined,
    sortDir: typeof params.sortDir === "string" ? params.sortDir : undefined,
  });

  const { rows, total } = await listCourses(parsed);

  return (
    <>
      <PageHeader
        eyebrow="Courses"
        title="All courses"
        description="Your catalog of training and educational programs."
      />
      <div className="flex-1 space-y-4 p-6">
        <CoursesClient rows={rows} total={total} />
      </div>
    </>
  );
}
