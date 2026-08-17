import { Activity } from "lucide-react";
import { getActivitiesForEntity } from "@/lib/activity";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { EmptyState } from "@/components/primitives/empty-state";

export async function ActivityTab({ studentId }: { studentId: string }) {
  const events = await getActivitiesForEntity("Student", studentId);

  if (events.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No activity yet"
        description="Registrations, payments, communications, and other student events will appear here as they happen."
      />
    );
  }

  return <ActivityTimeline events={events} />;
}
