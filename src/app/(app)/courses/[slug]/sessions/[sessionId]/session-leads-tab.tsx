import { getLeadsForSession } from "./actions";
import { SessionLeadsClient } from "./session-leads-client";

export async function SessionLeadsTab({ sessionId }: { sessionId: string }) {
  const leads = await getLeadsForSession(sessionId);
  return <SessionLeadsClient leads={leads} sessionId={sessionId} />;
}
