import { Activity } from "lucide-react";
import { getActivitiesForEntity } from "@/lib/activity";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { EmptyState } from "@/components/primitives/empty-state";

export async function CourseActivityTab({ courseId }: { courseId: string }) {
  const events = await getActivitiesForEntity("Course", courseId);

  if (events.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No activity yet"
        description="Registrations, payments, attendance, and other course events will appear here as they happen."
      />
    );
  }

  return <ActivityTimeline events={events} />;
}
