import { Suspense } from "react";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { getActiveLiveSessions, getLiveSessionHistory, joinAsObserver } from "./actions";
import { LiveSessionsClient } from "./live-sessions-client";

export const metadata: Metadata = { title: "Live Sessions" };

export default async function LiveSessionsPage() {
  const session = await auth();
  if (!hasPermission(session?.user?.role, "live.view")) {
    redirect("/dashboard");
  }

  const [active, history] = await Promise.all([
    getActiveLiveSessions(),
    getLiveSessionHistory({ limit: 50 }),
  ]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Live Sessions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor active sessions and review past classroom activity.
          </p>
        </div>
      </div>

      <Suspense>
        <LiveSessionsClient
          active={active}
          history={history}
          joinAsObserverAction={joinAsObserver}
        />
      </Suspense>
    </div>
  );
}
