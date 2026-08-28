import { ChevronUp, HelpCircle, Pin } from "lucide-react";

import { cn } from "@/lib/utils";
import type { LiveQuestionRow } from "@/app/(app)/courses/[slug]/sessions/[sessionId]/live-session-actions";

export function QAHistory({ questions }: { questions: LiveQuestionRow[] }) {
  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <HelpCircle className="size-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          No questions were asked in this session.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {questions.map((q) => (
        <div
          key={q.id}
          className="overflow-hidden rounded-xl border border-border/60 bg-card"
        >
          <div className="px-4 py-3">
            <div className="flex flex-wrap items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {q.askerName}
                  </span>
                  {q.status === "PINNED" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                      <Pin className="size-2.5" />
                      Pinned
                    </span>
                  )}
                  {q.status === "ANSWERED" && (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      Answered
                    </span>
                  )}
                  {q.status === "ARCHIVED" && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Archived
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground">{q.body}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-xs text-muted-foreground">
                <ChevronUp className="size-3.5" />
                <span className="tabular-nums">{q.upvotes}</span>
              </div>
            </div>

            {q.status === "ANSWERED" && q.answer && (
              <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                <p className="mb-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  Trainer's answer
                </p>
                <p className="text-sm text-foreground/80">{q.answer}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
