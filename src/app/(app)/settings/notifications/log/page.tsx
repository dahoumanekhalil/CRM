import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/primitives/page-header";
import { Forbidden } from "@/components/primitives/forbidden";
import { requirePermissionPage } from "@/lib/auth-guards";
import { getDeliveryLog } from "./actions";
import { LogClient } from "./log-client";

export const metadata = { title: "Notification Log" };

export default async function NotificationLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const { allowed } = await requirePermissionPage("settings.view");
  if (!allowed) {
    return (
      <Forbidden
        title="Admins only"
        description="The notification delivery log is restricted to administrator accounts."
        hint="Ask an admin to share a screenshot if you need to investigate a specific delivery."
      />
    );
  }

  const sp = await searchParams;
  const data = await getDeliveryLog({
    status: sp.status,
    recipient: sp.recipient,
    from: sp.from,
    to: sp.to,
    page: sp.page ? Number(sp.page) : 1,
    pageSize: 20,
  });

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        eyebrow="Settings → Notifications"
        title="Notification Log"
        description="Audit trail for all scheduled notification deliveries — type, recipient, channel, and delivery outcome."
      />
      <div className="flex-1 px-6 py-6">
        <LogClient initialData={data} />
      </div>
    </div>
  );
}
