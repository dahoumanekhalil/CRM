import { PageHeader } from "@/components/primitives/page-header";
import { Forbidden } from "@/components/primitives/forbidden";
import { requirePermissionPage } from "@/lib/auth-guards";
import { getEmployeeTelegramListForManager } from "../actions";
import { ManagerTelegramClient } from "./manager-client";

export const metadata = { title: "Team Telegram" };

export default async function ManagerTelegramPage() {
  const { allowed } = await requirePermissionPage("telegram.manage");
  if (!allowed) {
    return (
      <Forbidden
        title="Managers only"
        description="This page is restricted to managers and administrators."
        hint="Contact an administrator if you need to manage Telegram connections."
      />
    );
  }

  const connections = await getEmployeeTelegramListForManager();

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        eyebrow="Settings → Telegram"
        title="Team Telegram"
        description="View your team's Telegram connection status and generate secure linking tokens."
      />
      <div className="flex-1 px-6 py-6">
        <ManagerTelegramClient initialData={connections} />
      </div>
    </div>
  );
}
