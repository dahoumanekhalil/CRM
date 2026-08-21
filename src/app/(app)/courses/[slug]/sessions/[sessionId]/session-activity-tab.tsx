import { Activity } from "lucide-react";
import { getActivitiesForEntity } from "@/lib/activity";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { EmptyState } from "@/components/primitives/empty-state";

export async function SessionActivityTab({ sessionId }: { sessionId: string }) {
  const events = await getActivitiesForEntity("CourseSession", sessionId);

  if (events.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No activity yet"
        description="Attendance records, payment updates, and status changes for this group will appear here."
      />
    );
  }

  return <ActivityTimeline events={events} />;
}
