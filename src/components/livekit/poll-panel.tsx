"use client";

import * as React from "react";
import {
  useRoomContext,
  useLocalParticipant,
} from "@livekit/components-react";
import { BarChart2, Check, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ── Wire protocol ─────────────────────────────────────────────────────────────

type PollCreate = {
  type: "poll_create";
  poll: { id: string; question: string; options: string[] };
};
type PollVote = {
  type: "poll_vote";
  pollId: string;
  option: string;
  voterIdentity: string;
};
type PollClose = { type: "poll_close"; pollId: string };
type PollMsg = PollCreate | PollVote | PollClose;

function encode(msg: PollMsg): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(
    JSON.stringify(msg)
  ) as Uint8Array<ArrayBuffer>;
}

export function decodePollMsg(payload: Uint8Array): PollMsg | null {
  try {
    const parsed = JSON.parse(
      new TextDecoder().decode(payload)
    ) as unknown;
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "type" in parsed
    ) {
      const t = (parsed as { type: unknown }).type;
      if (t === "poll_create" || t === "poll_vote" || t === "poll_close") {
        return parsed as PollMsg;
      }
    }
  } catch {}
  return null;
}

// ── Shared types ──────────────────────────────────────────────────────────────

export type ActivePoll = {
  id: string;
  question: string;
  options: string[];
  votes: Record<string, number>; // option → count
  voters: string[]; // identities that voted (for local dedup)
};

// ── PollCreatorDialog (host) ──────────────────────────────────────────────────

export function PollCreatorDialog({
  liveSessionId,
  createPollAction,
  onCreated,
  onClose,
}: {
  liveSessionId: string;
  createPollAction: (
    liveSessionId: string,
    question: string,
    options: string[]
  ) => Promise<
    | { ok: true; data: { id: string; question: string; options: string[] } }
    | { ok: false; error: string }
  >;
  onCreated: (poll: { id: string; question: string; options: string[] }) => void;
  onClose: () => void;
}) {
  const room = useRoomContext();
  const [question, setQuestion] = React.useState("");
  const [options, setOptions] = React.useState(["", ""]);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  function addOption() {
    if (options.length < 6) setOptions((o) => [...o, ""]);
  }

  function removeOption(i: number) {
    if (options.length <= 2) return;
    setOptions((o) => o.filter((_, idx) => idx !== i));
  }

  function setOption(i: number, value: string) {
    setOptions((o) => o.map((v, idx) => (idx === i ? value : v)));
  }

  const validOptions = options.map((o) => o.trim()).filter(Boolean);
  const canSubmit =
    !submitting && question.trim().length > 0 && validOptions.length >= 2;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);
    const res = await createPollAction(
      liveSessionId,
      question.trim(),
      validOptions
    );
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const poll = res.data;
    void room.localParticipant.publishData(
      encode({ type: "poll_create", poll }),
      { reliable: true }
    );
    onCreated(poll);
    onClose();
  }

  return (
    <div className="absolute end-4 top-12 z-40 w-72 overflow-hidden rounded-xl border border-white/10 bg-black/90 shadow-2xl backdrop-blur-sm">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <BarChart2 className="size-4 text-violet-400" />
        <span className="text-sm font-medium text-white">Create Poll</span>
        <button
          onClick={onClose}
          aria-label="Close"
          className="ms-auto text-white/40 hover:text-white"
        >
          <X className="size-4" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3 p-4">
        <div>
          <label htmlFor="poll-question" className="mb-1.5 block text-xs font-medium text-white/70">
            Question
          </label>
          <Input
            id="poll-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask the class…"
            className="h-8 border-white/10 bg-white/5 text-sm text-white placeholder:text-white/30 focus-visible:ring-violet-500"
            maxLength={200}
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-white/70">
            Options
          </label>
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Input
                value={opt}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                aria-label={`Option ${i + 1}`}
                className="h-8 border-white/10 bg-white/5 text-sm text-white placeholder:text-white/30 focus-visible:ring-violet-500"
                maxLength={100}
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  aria-label="Remove option"
                  className="shrink-0 text-white/30 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          ))}
          {options.length < 6 && (
            <button
              type="button"
              onClick={addOption}
              className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              <Plus className="size-3" />
              Add option
            </button>
          )}
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <Button
          type="submit"
          size="sm"
          disabled={!canSubmit}
          className="w-full bg-violet-600 text-white hover:bg-violet-500"
        >
          {submitting ? "Launching…" : "Launch Poll"}
        </Button>
      </form>
    </div>
  );
}

// ── ActivePollResults (host overlay) ─────────────────────────────────────────

export function ActivePollResults({
  activePoll,
  closePollAction,
  onClose,
}: {
  activePoll: ActivePoll;
  closePollAction: (pollId: string) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
}) {
  const room = useRoomContext();
  const [closing, setClosing] = React.useState(false);
  const totalVotes = Object.values(activePoll.votes).reduce(
    (a, b) => a + b,
    0
  );

  async function handleClose() {
    setClosing(true);
    await closePollAction(activePoll.id);
    void room.localParticipant.publishData(
      encode({ type: "poll_close", pollId: activePoll.id }),
      { reliable: true }
    );
    setClosing(false);
    onClose();
  }

  return (
    <div className="absolute end-4 top-4 z-30 w-60 overflow-hidden rounded-xl border border-white/10 bg-black/80 shadow-xl backdrop-blur-sm">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <BarChart2 className="size-3.5 shrink-0 text-violet-400" />
        <span className="min-w-0 truncate text-xs font-medium text-white">
          {activePoll.question}
        </span>
        <span className="ms-auto shrink-0 text-[10px] tabular-nums text-white/50">
          {totalVotes}v
        </span>
      </div>

      <div className="space-y-2 p-3">
        {activePoll.options.map((opt) => {
          const count = activePoll.votes[opt] ?? 0;
          const pct =
            totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          return (
            <div key={opt} className="space-y-0.5">
              <div className="flex justify-between text-[10px] text-white/70">
                <span className="min-w-0 truncate">{opt}</span>
                <span className="ms-2 shrink-0 tabular-nums">
                  {count} ({pct}%)
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-white/10 px-3 pb-3">
        <Button
          size="sm"
          onClick={handleClose}
          disabled={closing}
          variant="ghost"
          className="h-7 w-full text-xs text-white/70 hover:bg-white/10 hover:text-white"
        >
          {closing ? "Closing…" : "Close Poll"}
        </Button>
      </div>
    </div>
  );
}

// ── PollVoteOverlay (student overlay) ────────────────────────────────────────

export function PollVoteOverlay({
  activePoll,
  submitVoteAction,
}: {
  activePoll: ActivePoll;
  submitVoteAction: (
    pollId: string,
    voterIdentity: string,
    option: string
  ) => Promise<{ ok: boolean; error?: string }>;
}) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const identity = localParticipant.identity;
  const [myVote, setMyVote] = React.useState<string | null>(null);

  function handleVote(option: string) {
    if (myVote) return;
    setMyVote(option);
    void room.localParticipant.publishData(
      encode({
        type: "poll_vote",
        pollId: activePoll.id,
        option,
        voterIdentity: identity,
      }),
      { reliable: true }
    );
    void submitVoteAction(activePoll.id, identity, option);
  }

  return (
    <div className="absolute inset-x-0 bottom-16 z-30 mx-auto w-72">
      <div className="overflow-hidden rounded-xl border border-white/10 bg-black/85 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <BarChart2 className="size-4 shrink-0 text-violet-400" />
          <span className="text-sm font-medium text-white">
            {activePoll.question}
          </span>
        </div>
        <div className="space-y-2 p-4">
          {activePoll.options.map((opt) => (
            <button
              key={opt}
              onClick={() => handleVote(opt)}
              disabled={!!myVote}
              className={cn(
                "w-full rounded-lg border px-3 py-2.5 text-start text-sm transition-all",
                myVote === opt
                  ? "border-violet-500 bg-violet-500/20 text-violet-300"
                  : myVote
                  ? "cursor-not-allowed border-white/5 bg-white/5 text-white/40"
                  : "border-white/10 bg-white/5 text-white hover:border-violet-500/50 hover:bg-violet-500/10"
              )}
            >
              <span className="flex items-center gap-2">
                {myVote === opt && (
                  <Check className="size-3.5 shrink-0 text-violet-400" />
                )}
                {opt}
              </span>
            </button>
          ))}
          {myVote && (
            <p className="text-center text-xs text-white/40">
              Vote recorded — waiting for results
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
