import { PageHeader } from "@/components/primitives/page-header";
import { Forbidden } from "@/components/primitives/forbidden";
import { requirePermissionPage } from "@/lib/auth-guards";
import { getEmployeeTelegramList } from "./actions";
import { TelegramAdminClient } from "./telegram-admin-client";

export const metadata = { title: "Telegram Management" };

export default async function TelegramAdminPage() {
  const { allowed } = await requirePermissionPage("telegram.admin");
  if (!allowed) {
    return (
      <Forbidden
        title="Admins only"
        description="The Telegram management page is restricted to administrator accounts."
        hint="Contact an administrator if you need to manage employee Telegram connections."
      />
    );
  }

  const connections = await getEmployeeTelegramList();

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        eyebrow="Settings → Telegram"
        title="Telegram Management"
        description="View and manage Telegram connections for all employees. Generate secure linking tokens or revoke access."
      />
      <div className="flex-1 px-6 py-6">
        <TelegramAdminClient initialData={connections} />
      </div>
    </div>
  );
}
