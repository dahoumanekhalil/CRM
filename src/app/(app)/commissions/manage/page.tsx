import { getTeamCommissionOverview } from "./actions";
import { ManageCommissionsClient } from "./manage-client";

export const metadata = { title: "Team Commissions" };

export default async function ManageCommissionsPage() {
  const rows = await getTeamCommissionOverview();

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team Commissions</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Overview of all agent commissions. Click a row to view detail and make adjustments.
        </p>
      </div>
      <ManageCommissionsClient rows={rows} />
    </div>
  );
}
