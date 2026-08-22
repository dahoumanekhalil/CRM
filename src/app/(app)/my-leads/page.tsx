import type { Metadata } from "next";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/permissions";
import { listLeads, listCoursesForLeadFilter, listSalesTeam } from "../leads/actions";
import { listLeadsSchema } from "@/lib/schemas/lead";
import { LeadsClient } from "../leads/leads-client";
import { PageHeader } from "@/components/primitives/page-header";
import { getMyLeadsWorkspace } from "./actions";
import { MyLeadsWorkspace } from "./my-leads-workspace";

export const metadata: Metadata = { title: "My Leads" };

export default async function MyLeadsPage({
  searchParams,
}: PageProps<"/my-leads">) {
  const params = await searchParams;
  const session = await auth();
  const canAssign = hasPermission(session?.user?.role, "leads.assign");

  // `?view=table` falls back to the full table — useful for advanced filtering
  const viewTable = params.view === "table" || params.status || params.q || params.followUp;

  if (viewTable) {
    const parsed = listLeadsSchema.parse({
      q: typeof params.q === "string" ? params.q : undefined,
      status: typeof params.status === "string" ? params.status : undefined,
      courseId: typeof params.courseId === "string" ? params.courseId : undefined,
      followUp: typeof params.followUp === "string" ? params.followUp : undefined,
      ownership: "mine",
      highPriority:
        typeof params.highPriority === "string" ? params.highPriority : undefined,
      page: typeof params.page === "string" ? params.page : undefined,
      pageSize: typeof params.pageSize === "string" ? params.pageSize : undefined,
      sortBy: typeof params.sortBy === "string" ? params.sortBy : undefined,
      sortDir: typeof params.sortDir === "string" ? params.sortDir : undefined,
    });

    const [{ rows, total }, courses, salesTeam] = await Promise.all([
      listLeads(parsed),
      listCoursesForLeadFilter(),
      canAssign ? listSalesTeam() : Promise.resolve([]),
    ]);

    return (
      <>
        <PageHeader
          eyebrow="My workspace"
          title="My Leads"
          description={`${total} lead${total !== 1 ? "s" : ""} assigned to you`}
        />
        <div className="flex-1 space-y-4 p-4 sm:p-6">
          <LeadsClient
            rows={rows}
            total={total}
            courses={courses}
            salesTeam={salesTeam}
            canAssign={canAssign}
            hideOwnershipFilter
          />
        </div>
      </>
    );
  }

  const workspace = await getMyLeadsWorkspace();

  return (
    <>
      <PageHeader
        eyebrow="My workspace"
        title="My Leads"
        description={`${workspace.totalActive} active lead${workspace.totalActive !== 1 ? "s" : ""}`}
      />
      <div className="flex-1 p-4 sm:p-6 max-w-2xl">
        <MyLeadsWorkspace workspace={workspace} />
      </div>
    </>
  );
}
