import type { Metadata } from "next";
import { requirePermissionPage } from "@/lib/auth-guards";
import { Forbidden } from "@/components/primitives/forbidden";
import { PageHeader } from "@/components/primitives/page-header";
import { listSalesTeam } from "@/app/(app)/leads/actions";
import {
  getSalesWorkspaceData,
  listUnassignedLeadsForManager,
  getSalesTeamDetails,
  getSalesFunnel,
  getSessionSalesStats,
} from "./actions";
import { SalesManagerClient } from "./sales-client";

export const metadata: Metadata = { title: "Sales Operations" };

export default async function SalesPage() {
  const { allowed } = await requirePermissionPage("sales.view");
  if (!allowed) return <Forbidden />;

  const [
    kpis,
    { rows: unassignedRows, total: unassignedTotal },
    teamRows,
    funnel,
    sessionStats,
    salesTeam,
  ] = await Promise.all([
    getSalesWorkspaceData(),
    listUnassignedLeadsForManager({ pageSize: 100 }),
    getSalesTeamDetails(),
    getSalesFunnel(),
    getSessionSalesStats(8),
    listSalesTeam(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Sales"
        title="Sales Operations"
        description="Assign incoming leads, monitor your team, and track the sales pipeline."
      />
      <div className="flex-1 space-y-6 p-6">
        <SalesManagerClient
          kpis={kpis}
          unassignedRows={unassignedRows}
          unassignedTotal={unassignedTotal}
          teamRows={teamRows}
          funnel={funnel}
          sessionStats={sessionStats}
          salesTeam={salesTeam}
        />
      </div>
    </>
  );
}
