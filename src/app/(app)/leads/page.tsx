import { PageHeader } from "@/components/primitives/page-header";
import { listCoursesForLeadFilter, listLeads, listSalesTeam } from "./actions";
import { listLeadsSchema } from "@/lib/schemas/lead";
import { LeadsClient } from "./leads-client";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata = { title: "Leads" };

export default async function LeadsPage({
  searchParams,
}: PageProps<"/leads">) {
  const params = await searchParams;
  const parsed = listLeadsSchema.parse({
    q: typeof params.q === "string" ? params.q : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    courseId: typeof params.courseId === "string" ? params.courseId : undefined,
    followUp: typeof params.followUp === "string" ? params.followUp : undefined,
    ownership: typeof params.ownership === "string" ? params.ownership : undefined,
    highPriority: typeof params.highPriority === "string" ? params.highPriority : undefined,
    page: typeof params.page === "string" ? params.page : undefined,
    pageSize: typeof params.pageSize === "string" ? params.pageSize : undefined,
    sortBy: typeof params.sortBy === "string" ? params.sortBy : undefined,
    sortDir: typeof params.sortDir === "string" ? params.sortDir : undefined,
  });

  const session = await auth();
  const canAssign = hasPermission(session?.user?.role, "leads.assign");

  const [{ rows, total }, courses, salesTeam] = await Promise.all([
    listLeads(parsed),
    listCoursesForLeadFilter(),
    canAssign ? listSalesTeam() : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Sales"
        title="Leads"
        description="Manage everyone who's shown interest in your courses."
      />
      <div className="flex-1 space-y-4 p-6">
        <LeadsClient
          rows={rows}
          total={total}
          courses={courses}
          salesTeam={salesTeam}
          canAssign={canAssign}
        />
      </div>
    </>
  );
}
