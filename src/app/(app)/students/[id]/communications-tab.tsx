import { getCommunicationsForStudent } from "@/app/(app)/communications/actions";
import { CommunicationsTab } from "@/components/shared/communications-tab";

export async function StudentCommunicationsTab({ studentId }: { studentId: string }) {
  const rows = await getCommunicationsForStudent(studentId);
  return <CommunicationsTab rows={rows} studentId={studentId} />;
}
