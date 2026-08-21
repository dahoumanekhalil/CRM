import { PageHeader } from "@/components/primitives/page-header";
import { Forbidden } from "@/components/primitives/forbidden";
import { requirePermissionPage } from "@/lib/auth-guards";
import { getConnectedAccounts, getBroadcastHistory } from "./actions";
import { BroadcastClient } from "./broadcast-client";

export const metadata = { title: "Telegram Broadcast" };

export default async function TelegramBroadcastPage() {
  const { allowed } = await requirePermissionPage("telegram.admin");
  if (!allowed) {
    return (
      <Forbidden
        title="Admins only"
        description="Sending Telegram broadcasts is restricted to administrators."
        hint="Contact an administrator if you need to send a broadcast."
      />
    );
  }

  const [accounts, history] = await Promise.all([
    getConnectedAccounts(),
    getBroadcastHistory(),
  ]);

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        eyebrow="Settings → Telegram"
        title="Broadcast Message"
        description="Send a Telegram message to all connected accounts or a specific group. Messages are sent from the WEBSCALE CRM bot."
      />
      <div className="flex-1 px-6 py-6">
        <BroadcastClient accounts={accounts} history={history} />
      </div>
    </div>
  );
}
