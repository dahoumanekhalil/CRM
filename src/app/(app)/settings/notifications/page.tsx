import Link from "next/link";
import { redirect } from "next/navigation";
import { ScrollText } from "lucide-react";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/primitives/page-header";
import { getTelegramStatus, getNotificationPreferences } from "./actions";
import { TelegramSection } from "./telegram-section";
import { PreferencesSection } from "./preferences-section";

export const metadata = { title: "Notification Settings" };

export default async function NotificationsSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const isAdmin = hasPermission(session.user.role, "settings.view");

  // Fetch in parallel — getNotificationPreferences also seeds defaults on first visit
  const [telegramStatus, preferences] = await Promise.all([
    getTelegramStatus(),
    getNotificationPreferences(),
  ]);

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        eyebrow="Account"
        title="Notification Settings"
        description="Control how and where you receive notifications from Webscale."
      />

      <div className="flex-1 px-6 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <TelegramSection initialStatus={telegramStatus} />
          <PreferencesSection
            initialPreferences={preferences}
            connected={telegramStatus.connected}
          />
          {isAdmin ? (
            <Link
              href="/settings/notifications/log"
              className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-5 py-3.5 text-sm text-muted-foreground transition-colors hover:border-border hover:text-foreground"
            >
              <ScrollText className="size-4 shrink-0" />
              <span>View notification delivery log</span>
              <span className="ms-auto text-xs font-medium uppercase tracking-wider opacity-50">
                Admin
              </span>
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
