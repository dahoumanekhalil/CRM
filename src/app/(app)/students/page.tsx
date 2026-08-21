import { PageHeader } from "@/components/primitives/page-header";
import { listStudentsSchema } from "@/lib/schemas/student";
import { listStudents } from "./actions";
import { StudentsClient } from "./students-client";

export const metadata = { title: "Students" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readString(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const parsed = listStudentsSchema.parse({
    q: readString(params.q),
    tag: readString(params.tag),
    paymentStatus: readString(params.paymentStatus),
    page: readString(params.page),
    pageSize: readString(params.pageSize),
    sortBy: readString(params.sortBy),
    sortDir: readString(params.sortDir),
  });

  const { rows, total } = await listStudents(parsed);

  return (
    <>
      <PageHeader
        eyebrow="Students"
        title="All students"
        description="People registered — or about to be — for your courses."
      />
      <div className="flex-1 space-y-4 p-6">
        <StudentsClient rows={rows} total={total} />
      </div>
    </>
  );
}
