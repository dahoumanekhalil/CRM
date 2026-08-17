import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { RegistrationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/permissions";
import { getLeadDetail, listLeadsUsers, listSalesTeam, getLeadAssignmentHistory } from "../actions";
import { LeadHeader } from "./lead-header";
import { LeadTabsView } from "./lead-tabs";
import { OverviewTab } from "./overview-tab";
import { LeadCommunicationsTab } from "./communications-tab";
import { NotesTab } from "./notes-tab";
import { AttributionTab } from "./attribution-tab";
import { ActivityTab } from "./activity-tab";
import type { SessionForConvert } from "@/components/shared/convert-lead-dialog";

type Params = Promise<{ id: string }>;

const CAPACITY_STATUSES: RegistrationStatus[] = [
  "PENDING",
  "CONFIRMED",
  "ATTENDING",
  "COMPLETED",
];

async function loadSessionsForConvert(
  courseId: string | null
): Promise<SessionForConvert[]> {
  const rows = await prisma.courseSession.findMany({
    where: {
      endDate: { gte: new Date() },
      status: { notIn: ["CANCELLED", "COMPLETED"] },
      ...(courseId ? { courseId } : {}),
    },
    orderBy: { startDate: "asc" },
    take: 20,
    include: {
      _count: {
        select: {
          registrations: {
            where: { status: { in: CAPACITY_STATUSES } },
          },
        },
      },
    },
  });
  return rows.map((s) => ({
    id: s.id,
    title: s.title,
    startDate: s.startDate,
    endDate: s.endDate,
    city: s.city,
    capacity: s.capacity,
    seatsTaken: s._count.registrations,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const lead = await getLeadDetail(id);
  const name = lead
    ? [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Lead"
    : "Lead";
  return { title: name };
}

export default async function LeadDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const session = await auth();
  const canAssign = hasPermission(session?.user?.role, "leads.assign");

  const [lead, users, salesTeam, assignmentHistory] = await Promise.all([
    getLeadDetail(id),
    listLeadsUsers(),
    canAssign ? listSalesTeam() : Promise.resolve([]),
    getLeadAssignmentHistory(id),
  ]);
  if (!lead) notFound();

  const sessionsForCourse = await loadSessionsForConvert(lead.courseId);
  const interestedSession = lead.interestedSession ?? null;

  return (
    <>
      <LeadHeader lead={lead} sessionsForCourse={sessionsForCourse} />
      <div className="flex-1 p-6">
        <LeadTabsView
          lead={lead}
          overviewSlot={
            <OverviewTab
              lead={lead}
              users={users}
              salesTeam={salesTeam}
              canAssign={canAssign}
              assignmentHistory={assignmentHistory}
              interestedSession={interestedSession}
            />
          }
          communicationsSlot={<LeadCommunicationsTab leadId={lead.id} />}
          notesSlot={<NotesTab lead={lead} />}
          attributionSlot={<AttributionTab lead={lead} />}
          activitySlot={<ActivityTab leadId={lead.id} />}
        />
      </div>
    </>
  );
}
