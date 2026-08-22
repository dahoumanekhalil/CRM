import { getMyCommissions } from "./actions";
import { MyCommissionsClient } from "./my-commissions-client";

export const metadata = { title: "My Commissions" };

export default async function MyCommissionsPage() {
  const data = await getMyCommissions();

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Commissions</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your commission earnings and payout history.
        </p>
      </div>
      <MyCommissionsClient
        summary={data.summary}
        commissions={data.commissions}
        ledger={data.ledger}
      />
    </div>
  );
}
