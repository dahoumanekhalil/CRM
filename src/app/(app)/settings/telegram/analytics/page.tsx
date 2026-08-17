import { PageHeader } from "@/components/primitives/page-header";
import { Forbidden } from "@/components/primitives/forbidden";
import { requirePermissionPage } from "@/lib/auth-guards";
import {
  getAnalyticsSummary,
  getVolumeTimeSeries,
  getTypeBreakdown,
  getEmployeeDeliveryStats,
  getRetryStats,
  getSystemHealth,
  getMergedActivity,
  getDeliveryStats,
  getFailureStats,
  getConnectionStats,
} from "./actions";
import { AnalyticsClient } from "./analytics-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Telegram Analytics" };

export default async function TelegramAnalyticsPage() {
  const { allowed } = await requirePermissionPage("telegram.admin");
  if (!allowed) {
    return (
      <Forbidden
        title="Admins only"
        description="Telegram analytics is restricted to administrator accounts."
        hint="Contact an administrator if you need to view Telegram delivery statistics."
      />
    );
  }

  const [
    summary,
    health,
    employees,
    retryStats,
    deliveryStats,
    failureStats,
    connectionStats,
    recentActivity,
    volume,
    typeBreakdown,
  ] = await Promise.all([
    getAnalyticsSummary(),
    getSystemHealth(),
    getEmployeeDeliveryStats(),
    getRetryStats(),
    getDeliveryStats(),
    getFailureStats(30),
    getConnectionStats(),
    getMergedActivity(20),
    getVolumeTimeSeries(30),
    getTypeBreakdown(30),
  ]);

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        eyebrow="Settings → Telegram"
        title="Telegram Analytics"
        description="Delivery performance, connection health, and notification audit trail."
      />
      <div className="flex-1 px-6 py-6">
        <AnalyticsClient
          summary={summary}
          health={health}
          employees={employees}
          retryStats={retryStats}
          deliveryStats={deliveryStats}
          initialFailureStats={failureStats}
          connectionStats={connectionStats}
          recentActivity={recentActivity}
          initialVolume={volume}
          initialTypeBreakdown={typeBreakdown}
        />
      </div>
    </div>
  );
}
