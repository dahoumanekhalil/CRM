import { getActivitiesForEntity } from "@/lib/activity";
import { ActivityTimeline } from "@/components/shared/activity-timeline";

export async function ActivityTab({ leadId }: { leadId: string }) {
  const events = await getActivitiesForEntity("Lead", leadId);
  return <ActivityTimeline events={events} />;
}
