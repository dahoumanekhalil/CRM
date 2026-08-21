import { PageHeader } from "@/components/primitives/page-header";
import { Forbidden } from "@/components/primitives/forbidden";
import { listPaymentsSchema } from "@/lib/schemas/payment";
import { requirePermissionPage } from "@/lib/auth-guards";
import {
  listPayments,
  listStudentsForPaymentPicker,
  getOutstandingBalances,
} from "./actions";
import { PaymentsClient } from "./payments-client";

export const metadata = { title: "Payments" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const readString = (v: string | string[] | undefined) =>
  typeof v === "string" ? v : undefined;

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { allowed } = await requirePermissionPage("payments.view");
  if (!allowed) {
    return (
      <Forbidden
        title="Payments is Finance-only"
        description="Only Admin, Manager and Finance roles can view payment records."
      />
    );
  }

  const params = await searchParams;
  const rawStatus = readString(params.status);
  const isOutstandingView = rawStatus === "OUTSTANDING";

  const parsed = listPaymentsSchema.parse({
    q: readString(params.q),
    status: isOutstandingView ? "ALL" : rawStatus,
    method: readString(params.method),
    studentId: readString(params.studentId),
    page: readString(params.page),
    pageSize: readString(params.pageSize),
    sortBy: readString(params.sortBy),
    sortDir: readString(params.sortDir),
  });

  const [{ rows, total }, students, outstandingBalances] = await Promise.all([
    isOutstandingView
      ? Promise.resolve({ rows: [], total: 0, page: 1, pageSize: 25 })
      : listPayments(parsed),
    listStudentsForPaymentPicker(),
    isOutstandingView ? getOutstandingBalances({ limit: 200 }) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Payments"
        description="Money received — recorded manually against students and sessions."
      />
      <div className="flex-1 space-y-4 p-6">
        <PaymentsClient
          rows={rows}
          total={total}
          students={students}
          outstandingBalances={outstandingBalances}
        />
      </div>
    </>
  );
}
