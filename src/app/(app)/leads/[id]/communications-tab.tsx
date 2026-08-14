import { getCommunicationsForLead } from "@/app/(app)/communications/actions";
import { CommunicationsTab } from "@/components/shared/communications-tab";

export async function LeadCommunicationsTab({ leadId }: { leadId: string }) {
  const rows = await getCommunicationsForLead(leadId);
  return <CommunicationsTab rows={rows} leadId={leadId} />;
}
