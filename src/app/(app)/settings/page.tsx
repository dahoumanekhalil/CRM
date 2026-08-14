import { notFound } from "next/navigation";
import { auth } from "@/auth";

import { PageHeader } from "@/components/primitives/page-header";
import { Forbidden } from "@/components/primitives/forbidden";
import { requirePermissionPage } from "@/lib/auth-guards";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { listUsers, getOrgSettings } from "./actions";
import { TeamTab } from "./team-tab";
import { GeneralTab } from "./general-tab";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { allowed } = await requirePermissionPage("settings.view");
  if (!allowed) {
    return (
      <Forbidden
        title="Settings are Admin-only"
        description="User and role management is restricted to Admins."
        hint="Contact your admin to have your role updated."
      />
    );
  }

  const session = await auth();
  if (!session?.user?.id) notFound();

  const [users, orgSettings] = await Promise.all([
    listUsers(),
    getOrgSettings(),
  ]);

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        eyebrow="Admin"
        title="Settings"
        description="Manage organization settings, team members, and roles."
      />
      <div className="flex-1 px-6 py-6">
        <div className="mx-auto max-w-3xl">
          <Tabs defaultValue="general">
            <TabsList className="mb-6">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
            </TabsList>
            <TabsContent value="general">
              <GeneralTab settings={orgSettings} />
            </TabsContent>
            <TabsContent value="team">
              <TeamTab users={users} currentUserId={session.user.id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
