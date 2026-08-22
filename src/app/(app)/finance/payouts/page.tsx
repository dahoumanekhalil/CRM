import { listAgentBalances, listPayouts } from "./actions";
import { PayoutsClient } from "./payouts-client";

export const metadata = { title: "Commission Payouts" };

export default async function PayoutsPage() {
  const [agents, payouts] = await Promise.all([
    listAgentBalances(),
    listPayouts(),
  ]);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Commission Payouts</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Review agent balances and process commission payouts.
        </p>
      </div>
      <PayoutsClient agents={agents} payouts={payouts} />
    </div>
  );
}
