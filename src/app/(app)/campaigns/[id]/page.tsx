import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Forbidden } from "@/components/primitives/forbidden";
import { requirePermissionPage } from "@/lib/auth-guards";
import {
  getCampaignAttribution,
  getCampaignDetail,
  getCampaignMetrics,
  getLeadsForCampaign,
} from "../actions";
import { CampaignHeader } from "./campaign-header";
import { CampaignTabsView } from "./campaign-tabs";
import { OverviewTab } from "./overview-tab";
import { LeadsTab } from "./leads-tab";
import { AttributionTab } from "./attribution-tab";

type Params = Promise<{ id: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const campaign = await getCampaignDetail(id);
  return { title: campaign?.name ?? "Campaign" };
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Params;
}) {
  const { allowed } = await requirePermissionPage("campaigns.view");
  if (!allowed) {
    return (
      <Forbidden
        title="Campaigns is Marketing-scoped"
        description="Only Admin, Manager and Marketing roles can view campaign detail."
      />
    );
  }

  const { id } = await params;
  const [campaign, metrics, leads, attribution] = await Promise.all([
    getCampaignDetail(id),
    getCampaignMetrics(id),
    getLeadsForCampaign(id),
    getCampaignAttribution(id),
  ]);
  if (!campaign) notFound();

  return (
    <>
      <CampaignHeader campaign={campaign} />
      <div className="flex-1 p-6">
        <CampaignTabsView
          leadsCount={campaign._count.leads}
          overviewSlot={
            <OverviewTab campaign={campaign} metrics={metrics} />
          }
          leadsSlot={<LeadsTab rows={leads} />}
          attributionSlot={<AttributionTab attribution={attribution} />}
        />
      </div>
    </>
  );
}
