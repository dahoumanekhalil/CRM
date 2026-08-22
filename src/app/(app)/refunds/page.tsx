import { listRefundApprovals } from "./actions";
import { RefundsClient } from "./refunds-client";

export const metadata = { title: "Refunds" };

export default async function RefundsPage() {
  const rows = await listRefundApprovals();

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Refunds</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Review and process student refund requests.
        </p>
      </div>
      <RefundsClient rows={rows} />
    </div>
  );
}
