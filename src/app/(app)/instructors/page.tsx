import { PageHeader } from "@/components/primitives/page-header";
import { Forbidden } from "@/components/primitives/forbidden";
import { requirePermissionPage } from "@/lib/auth-guards";
import { listInstructorsSchema } from "@/lib/schemas/instructor";
import { listInstructors } from "./actions";
import { InstructorsClient } from "./instructors-client";

export const metadata = { title: "Instructors" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readString(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export default async function InstructorsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { allowed } = await requirePermissionPage("courses.view");
  if (!allowed) {
    return (
      <Forbidden
        title="Instructors is not available"
        description="You don't have permission to view instructors."
      />
    );
  }

  const params = await searchParams;
  const parsed = listInstructorsSchema.parse({
    q: readString(params.q),
    page: readString(params.page),
  });
  const { rows, total } = await listInstructors(parsed);

  return (
    <>
      <PageHeader
        eyebrow="Courses"
        title="Instructors"
        description="Trainers and educators who deliver your courses and sessions."
      />
      <div className="flex-1 space-y-4 p-6">
        <InstructorsClient rows={rows} total={total} />
      </div>
    </>
  );
}
