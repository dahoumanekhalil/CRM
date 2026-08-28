import { BarChart2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PollWithResults } from "@/app/(app)/courses/[slug]/sessions/[sessionId]/live-session-actions";

export function PollHistory({ polls }: { polls: PollWithResults[] }) {
  if (polls.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <BarChart2 className="size-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No polls were run in this session.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {polls.map((poll) => (
        <div
          key={poll.id}
          className="overflow-hidden rounded-xl border border-border/60 bg-card"
        >
          <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
            <BarChart2 className="size-4 shrink-0 text-violet-500" />
            <span className="font-medium text-foreground text-sm">{poll.question}</span>
            <span
              className={cn(
                "ms-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                poll.status === "OPEN"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {poll.status === "OPEN" ? "Open" : "Closed"}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {poll.totalVotes} {poll.totalVotes === 1 ? "vote" : "votes"}
            </span>
          </div>

          <div className="space-y-2 p-4">
            {poll.results.map(({ option, count }) => {
              const pct =
                poll.totalVotes > 0
                  ? Math.round((count / poll.totalVotes) * 100)
                  : 0;
              const isWinner =
                poll.totalVotes > 0 &&
                count === Math.max(...poll.results.map((r) => r.count));

              return (
                <div key={option} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={cn(
                        "font-medium",
                        isWinner ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {option}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        isWinner ? "bg-violet-500" : "bg-violet-500/30"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
