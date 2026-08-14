import { PageHeader } from "@/components/primitives/page-header";
import { listCustomers } from "./actions";
import { CustomersClient } from "./customers-client";

export const metadata = { title: "Customers" };

export default async function CustomersPage() {
  const initialData = await listCustomers({
    page: 1,
    pageSize: 50,
    sortBy: "lastPaymentAt",
    sortDir: "desc",
  });

  return (
    <>
      <PageHeader
        eyebrow="Sales"
        title="Customers"
        description="Students who have made at least one payment."
      />
      <div className="flex-1 space-y-4 p-6">
        <CustomersClient initialData={initialData} />
      </div>
    </>
  );
}
