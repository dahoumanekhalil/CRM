import { PageHeader } from "@/components/primitives/page-header";
import { Forbidden } from "@/components/primitives/forbidden";
import { requirePermissionPage } from "@/lib/auth-guards";
import { listCampaignsSchema } from "@/lib/schemas/campaign";
import { listCampaigns } from "./actions";
import { CampaignsClient } from "./campaigns-client";

export const metadata = { title: "Campaigns" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const readString = (v: string | string[] | undefined) =>
  typeof v === "string" ? v : undefined;

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { allowed } = await requirePermissionPage("campaigns.view");
  if (!allowed) {
    return (
      <Forbidden
        title="Campaigns is Marketing-scoped"
        description="Only Admin, Manager and Marketing roles can view campaigns."
      />
    );
  }

  const params = await searchParams;
  const parsed = listCampaignsSchema.parse({
    q: readString(params.q),
    status: readString(params.status),
    page: readString(params.page),
    pageSize: readString(params.pageSize),
    sortBy: readString(params.sortBy),
    sortDir: readString(params.sortDir),
  });

  const { rows, total } = await listCampaigns(parsed);

  return (
    <>
      <PageHeader
        eyebrow="Marketing"
        title="Campaigns"
        description="Group leads by the marketing activity that generated them and track performance."
      />
      <div className="flex-1 space-y-4 p-6">
        <CampaignsClient rows={rows} total={total} />
      </div>
    </>
  );
}
