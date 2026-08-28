import { Clock, Crown, User, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SessionParticipant } from "@/app/(app)/courses/[slug]/sessions/[sessionId]/live-session-actions";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function RoleBadge({ role }: { role: string }) {
  const styles =
    role === "host"
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      : role === "student"
      ? "bg-primary/10 text-primary"
      : "bg-muted text-muted-foreground";

  const Icon = role === "host" ? Crown : User;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
        styles
      )}
    >
      <Icon className="size-2.5" />
      {role}
    </span>
  );
}

// ── ParticipantList ───────────────────────────────────────────────────────────

export function ParticipantList({
  participants,
  sessionDurationSeconds,
}: {
  participants: SessionParticipant[];
  sessionDurationSeconds?: number | null;
}) {
  if (participants.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Users className="size-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No participant data yet.</p>
        <p className="text-xs text-muted-foreground/60">
          Participants will appear here once the session goes live.
        </p>
      </div>
    );
  }

  const showAttendancePct =
    typeof sessionDurationSeconds === "number" && sessionDurationSeconds > 0;

  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/40">
            <th className="px-4 py-2.5 text-start text-xs font-medium text-muted-foreground">
              Name
            </th>
            <th className="hidden sm:table-cell px-4 py-2.5 text-start text-xs font-medium text-muted-foreground">
              Role
            </th>
            <th className="px-4 py-2.5 text-start text-xs font-medium text-muted-foreground">
              Joined
            </th>
            <th className="hidden sm:table-cell px-4 py-2.5 text-start text-xs font-medium text-muted-foreground">
              Duration
            </th>
            {showAttendancePct && (
              <th className="hidden md:table-cell px-4 py-2.5 text-start text-xs font-medium text-muted-foreground">
                Attended
              </th>
            )}
            <th className="px-4 py-2.5 text-start text-xs font-medium text-muted-foreground">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {participants.map((p) => {
            const isActive = !p.leftAt;
            const attendancePct =
              showAttendancePct && p.role === "student"
                ? Math.min(
                    100,
                    Math.round((p.totalDurationSeconds / sessionDurationSeconds!) * 100)
                  )
                : null;
            return (
              <tr key={p.id} className="bg-card hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-medium text-foreground">
                    {p.displayName}
                  </span>
                </td>
                <td className="hidden sm:table-cell px-4 py-3">
                  <RoleBadge role={p.role} />
                </td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground text-xs">
                  {p.joinedAt.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="hidden sm:table-cell px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                    <Clock className="size-3" />
                    {isActive ? (
                      <span className="text-emerald-500 font-medium">Live</span>
                    ) : (
                      formatDuration(p.totalDurationSeconds)
                    )}
                  </span>
                </td>
                {showAttendancePct && (
                  <td className="hidden md:table-cell px-4 py-3">
                    {attendancePct !== null ? (
                      <span
                        className={cn(
                          "tabular-nums text-xs font-medium",
                          attendancePct >= 75
                            ? "text-emerald-600 dark:text-emerald-400"
                            : attendancePct >= 50
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-red-600 dark:text-red-400"
                        )}
                      >
                        {attendancePct}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                )}
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                      isActive
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        isActive ? "bg-emerald-500" : "bg-muted-foreground/50"
                      )}
                    />
                    {isActive ? "In session" : "Left"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
