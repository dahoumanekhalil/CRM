import { PageHeader } from "@/components/primitives/page-header";
import { Forbidden } from "@/components/primitives/forbidden";
import { requirePermissionPage } from "@/lib/auth-guards";
import { reportRangeSchema } from "@/lib/schemas/report";
import {
  getPipelineReport,
  getRevenueReport,
  getTopCampaigns,
  getTopCourses,
  resolveRange,
} from "./actions";
import { ReportsHeader } from "./reports-header";
import { RevenueSection } from "./sections/revenue-section";
import { PipelineSection } from "./sections/pipeline-section";
import { CampaignsSection } from "./sections/campaigns-section";
import { CoursesSection } from "./sections/courses-section";
import { format, subDays } from "date-fns";

export const metadata = { title: "Reports" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const readString = (v: string | string[] | undefined) =>
  typeof v === "string" ? v : undefined;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { allowed } = await requirePermissionPage("reports.view");
  if (!allowed) {
    return (
      <Forbidden
        title="Reports are for Admins & Managers"
        description="Ask an admin to promote your role if you need business-wide analytics."
      />
    );
  }

  const params = await searchParams;
  const parsed = reportRangeSchema.parse({
    from: readString(params.from),
    to: readString(params.to),
  });

  const range = resolveRange(parsed.from, parsed.to);

  const [revenue, topCampaigns, topCourses] = await Promise.all([
    getRevenueReport(range),
    getTopCampaigns(range, 5),
    getTopCourses(range, 5),
  ]);
  const pipeline = await getPipelineReport(range, revenue.totalByCurrency);

  const defaultFrom = format(subDays(new Date(), 29), "yyyy-MM-dd");
  const defaultTo = format(new Date(), "yyyy-MM-dd");

  return (
    <>
      <PageHeader
        eyebrow="Insights"
        title="Reports"
        description="Revenue, funnel, campaigns and courses at a glance — pick any date range."
      />
      <ReportsHeader defaultFrom={defaultFrom} defaultTo={defaultTo} />
      <div className="flex-1 space-y-6 p-6">
        <RevenueSection data={revenue} />
        <PipelineSection data={pipeline} />
        <div className="grid gap-6 xl:grid-cols-2">
          <CampaignsSection rows={topCampaigns} />
          <CoursesSection rows={topCourses} />
        </div>
      </div>
    </>
  );
}
