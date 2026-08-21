import type { Metadata } from "next";
import { UserX } from "lucide-react";
import { listNoShows, listSessionsForPicker } from "./actions";
import { NoShowsClient } from "./no-shows-client";

export const metadata: Metadata = {
  title: "No-shows",
  description: "Students who paid but didn't attend their session.",
};

export default async function NoShowsPage() {
  const [rows, sessions] = await Promise.all([
    listNoShows(),
    listSessionsForPicker(),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <UserX className="size-5 text-orange-600 dark:text-orange-400" />
          <h1 className="text-2xl font-bold tracking-tight">No-shows</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Students who registered and paid but did not attend their session. Reassign to another date or issue a refund.
        </p>
      </div>

      <NoShowsClient rows={rows} sessions={sessions} />
    </div>
  );
}
