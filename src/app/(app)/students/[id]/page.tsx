import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { RegistrationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStudentDetail } from "../actions";
import { StudentHeader } from "./student-header";
import { StudentTabsView } from "./student-tabs";
import { OverviewTab } from "./overview-tab";
import { RegistrationsTab } from "./registrations-tab";
import { PaymentsTab } from "./payments-tab";
import { StudentCommunicationsTab } from "./communications-tab";
import { NotesTab } from "./notes-tab";
import { ActivityTab } from "./activity-tab";

type Params = Promise<{ id: string }>;

const CAPACITY_STATUSES: RegistrationStatus[] = [
  "PENDING",
  "CONFIRMED",
  "ATTENDING",
  "COMPLETED",
];

async function loadUpcomingSessions() {
  const rows = await prisma.courseSession.findMany({
    where: {
      endDate: { gte: new Date() },
      status: { notIn: ["CANCELLED", "COMPLETED"] },
    },
    orderBy: { startDate: "asc" },
    take: 40,
    include: {
      course: { select: { name: true } },
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
    courseName: s.course.name,
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
  const student = await getStudentDetail(id);
  const name = student
    ? [student.firstName, student.lastName].filter(Boolean).join(" ") ||
      "Student"
    : "Student";
  return { title: name };
}

export default async function StudentDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const student = await getStudentDetail(id);
  if (!student) notFound();

  const upcomingSessions = await loadUpcomingSessions();

  return (
    <>
      <StudentHeader student={student} upcomingSessions={upcomingSessions} />
      <div className="flex-1 p-6">
        <StudentTabsView
          student={student}
          overviewSlot={<OverviewTab student={student} />}
          registrationsSlot={<RegistrationsTab studentId={student.id} />}
          paymentsSlot={
            <PaymentsTab
              studentId={student.id}
              studentName={
                [student.firstName, student.lastName]
                  .filter(Boolean)
                  .join(" ") || "Student"
              }
            />
          }
          communicationsSlot={<StudentCommunicationsTab studentId={student.id} />}
          notesSlot={<NotesTab student={student} />}
          activitySlot={<ActivityTab studentId={student.id} />}
        />
      </div>
    </>
  );
}
