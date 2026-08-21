import { PageHeader } from "@/components/primitives/page-header";
import { Forbidden } from "@/components/primitives/forbidden";
import { requirePermissionPage } from "@/lib/auth-guards";
import { listExpensesSchema } from "@/lib/schemas/expense";
import { listExpenses } from "./actions";
import { ExpensesClient } from "./expenses-client";

export const metadata = { title: "Expenses" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const readString = (v: string | string[] | undefined) =>
  typeof v === "string" ? v : undefined;

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { allowed } = await requirePermissionPage("finance.view");
  if (!allowed) {
    return (
      <Forbidden
        title="Expenses is Finance-only"
        description="Only Admin, Manager and Finance roles can view expense records."
      />
    );
  }

  const params = await searchParams;
  const parsed = listExpensesSchema.parse({
    q: readString(params.q),
    category: readString(params.category),
    status: readString(params.status),
    courseId: readString(params.courseId),
    sessionId: readString(params.sessionId),
    from: readString(params.from),
    to: readString(params.to),
    page: readString(params.page),
    pageSize: readString(params.pageSize),
    sortBy: readString(params.sortBy),
    sortDir: readString(params.sortDir),
  });

  const { rows, total } = await listExpenses(parsed);

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Expenses"
        description="Costs incurred for courses and course runs — hall, food, materials, and more."
      />
      <div className="flex-1 space-y-4 p-6">
        <ExpensesClient rows={rows} total={total} />
      </div>
    </>
  );
}
