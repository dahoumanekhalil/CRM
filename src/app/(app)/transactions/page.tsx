import { PageHeader } from "@/components/primitives/page-header";
import { Forbidden } from "@/components/primitives/forbidden";
import { requirePermissionPage } from "@/lib/auth-guards";
import { listTransactions } from "./actions";
import { TransactionsClient } from "./transactions-client";

export const metadata = { title: "Transactions" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const readString = (v: string | string[] | undefined) =>
  typeof v === "string" ? v : undefined;

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { allowed } = await requirePermissionPage("payments.view");
  if (!allowed) {
    return (
      <Forbidden
        title="Transactions is Finance-only"
        description="Only Admin, Manager and Finance roles can view the transaction ledger."
      />
    );
  }

  const params = await searchParams;

  const page = Math.max(1, Number(readString(params.page) ?? "1") || 1);
  const pageSize = Math.min(
    200,
    Math.max(5, Number(readString(params.pageSize) ?? "25") || 25)
  );

  const { rows, total, summary } = await listTransactions({
    from: readString(params.from),
    to: readString(params.to),
    status: readString(params.status),
    method: readString(params.method),
    currency: readString(params.currency),
    q: readString(params.q),
    page,
    pageSize,
  });

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Transactions"
        description="Complete payment ledger — all money in and out."
      />
      <div className="flex-1 space-y-6 p-6">
        <TransactionsClient
          rows={rows}
          total={total}
          summary={summary}
        />
      </div>
    </>
  );
}
