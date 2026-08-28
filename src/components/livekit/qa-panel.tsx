"use client";

import * as React from "react";
import {
  useRoomContext,
  useLocalParticipant,
} from "@livekit/components-react";
import {
  ChevronUp,
  HelpCircle,
  Pin,
  PinOff,
  Send,
  CheckCircle,
  Archive,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ── Wire protocol ─────────────────────────────────────────────────────────────

type QAAsk = {
  type: "qa_ask";
  question: {
    id: string;
    askerIdentity: string;
    askerName: string;
    body: string;
    createdAt: number;
  };
};
type QAUpvote = {
  type: "qa_upvote";
  questionId: string;
  voterIdentity: string;
};
type QAUpdate = {
  type: "qa_update";
  questionId: string;
  status: string;
  answer?: string;
};
type QAMsg = QAAsk | QAUpvote | QAUpdate;

function encode(msg: QAMsg): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(
    JSON.stringify(msg)
  ) as Uint8Array<ArrayBuffer>;
}

export function decodeQAMsg(payload: Uint8Array): QAMsg | null {
  try {
    const parsed = JSON.parse(new TextDecoder().decode(payload)) as unknown;
    if (parsed !== null && typeof parsed === "object" && "type" in parsed) {
      const t = (parsed as { type: unknown }).type;
      if (t === "qa_ask" || t === "qa_upvote" || t === "qa_update") {
        return parsed as QAMsg;
      }
    }
  } catch {}
  return null;
}

// ── Shared state type ─────────────────────────────────────────────────────────

export type QAQuestion = {
  id: string;
  askerIdentity: string;
  askerName: string;
  body: string;
  status: "OPEN" | "PINNED" | "ANSWERED" | "ARCHIVED";
  answer: string | null;
  upvotes: number;
  upvoters: string[];
  createdAt: number; // unix ms
};

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: QAQuestion["status"] }) {
  if (status === "OPEN") return null;
  const styles: Record<string, string> = {
    PINNED: "bg-amber-500/20 text-amber-400",
    ANSWERED: "bg-emerald-500/20 text-emerald-400",
    ARCHIVED: "bg-white/10 text-white/40",
  };
  const labels: Record<string, string> = {
    PINNED: "Pinned",
    ANSWERED: "Answered",
    ARCHIVED: "Archived",
  };
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-medium",
        styles[status] ?? "bg-white/10 text-white/40"
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}

// ── QAPanel ───────────────────────────────────────────────────────────────────

export function QAPanel({
  questions,
  isHost,
  liveSessionId,
  askAction,
  upvoteAction,
  updateStatusAction,
  onAdd,
  onUpvote,
  onUpdate,
}: {
  questions: QAQuestion[];
  isHost: boolean;
  liveSessionId: string;
  askAction: (
    liveSessionId: string,
    body: string,
    askerIdentity: string,
    askerName: string
  ) => Promise<{ ok: boolean; error?: string; data?: { id: string; askerIdentity: string; askerName: string; body: string; createdAt: Date } }>;
  upvoteAction: (
    questionId: string,
    voterIdentity: string
  ) => Promise<{ ok: boolean; error?: string }>;
  updateStatusAction: (
    questionId: string,
    status: string,
    answer?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onAdd: (q: QAQuestion) => void;
  onUpvote: (questionId: string, voterIdentity: string) => void;
  onUpdate: (questionId: string, status: string, answer?: string) => void;
}) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const identity = localParticipant.identity;
  const displayName = localParticipant.name ?? identity;

  const [askText, setAskText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [answeringId, setAnsweringId] = React.useState<string | null>(null);
  const [answerText, setAnswerText] = React.useState("");

  // Sort: pinned → by upvotes → by age. Hide archived from students.
  const sorted = [...questions]
    .filter((q) => isHost || q.status !== "ARCHIVED")
    .sort((a, b) => {
      if (a.status === "PINNED" && b.status !== "PINNED") return -1;
      if (b.status === "PINNED" && a.status !== "PINNED") return 1;
      if (a.status === "ANSWERED" && b.status !== "ANSWERED") return 1;
      if (b.status === "ANSWERED" && a.status !== "ANSWERED") return -1;
      if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes;
      return a.createdAt - b.createdAt;
    });

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    const body = askText.trim();
    if (!body || sending) return;
    setSending(true);

    const res = await askAction(liveSessionId, body, identity, displayName);
    setSending(false);
    if (!res.ok || !res.data) return;

    const q: QAQuestion = {
      id: res.data.id,
      askerIdentity: identity,
      askerName: displayName,
      body,
      status: "OPEN",
      answer: null,
      upvotes: 0,
      upvoters: [],
      createdAt: res.data.createdAt.getTime(),
    };
    onAdd(q);
    void room.localParticipant.publishData(
      encode({ type: "qa_ask", question: { id: q.id, askerIdentity: q.askerIdentity, askerName: q.askerName, body: q.body, createdAt: q.createdAt } }),
      { reliable: true }
    );
    setAskText("");
  }

  function handleUpvote(q: QAQuestion) {
    if (q.upvoters.includes(identity) || q.askerIdentity === identity) return;
    onUpvote(q.id, identity);
    void room.localParticipant.publishData(
      encode({ type: "qa_upvote", questionId: q.id, voterIdentity: identity }),
      { reliable: true }
    );
    void upvoteAction(q.id, identity);
  }

  function handlePin(q: QAQuestion) {
    const next = q.status === "PINNED" ? "OPEN" : "PINNED";
    onUpdate(q.id, next);
    void room.localParticipant.publishData(
      encode({ type: "qa_update", questionId: q.id, status: next }),
      { reliable: true }
    );
    void updateStatusAction(q.id, next);
  }

  function handleArchive(q: QAQuestion) {
    onUpdate(q.id, "ARCHIVED");
    void room.localParticipant.publishData(
      encode({ type: "qa_update", questionId: q.id, status: "ARCHIVED" }),
      { reliable: true }
    );
    void updateStatusAction(q.id, "ARCHIVED");
  }

  async function handleAnswer(q: QAQuestion) {
    const answer = answerText.trim();
    if (!answer) return;
    onUpdate(q.id, "ANSWERED", answer);
    void room.localParticipant.publishData(
      encode({ type: "qa_update", questionId: q.id, status: "ANSWERED", answer }),
      { reliable: true }
    );
    void updateStatusAction(q.id, "ANSWERED", answer);
    setAnsweringId(null);
    setAnswerText("");
  }

  return (
    <div className="flex w-full shrink-0 flex-col border-s border-white/10 bg-black/40 md:w-80 max-h-60 md:max-h-none">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-3">
        <HelpCircle className="size-4 text-white/70" />
        <span className="text-sm font-medium text-white">Q&amp;A</span>
        <span className="ms-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/60">
          {sorted.length}
        </span>
      </div>

      {/* Question list */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <HelpCircle className="size-8 text-white/20" />
            <p className="text-xs text-white/40">
              {isHost
                ? "No questions yet"
                : "Be the first to ask a question"}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {sorted.map((q) => (
              <li key={q.id} className="space-y-2 p-3">
                {/* Question header */}
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-medium text-white/60">
                        {q.askerName}
                      </span>
                      <StatusBadge status={q.status} />
                    </div>
                    <p className="text-sm leading-snug text-white">{q.body}</p>
                  </div>
                </div>

                {/* Answer text */}
                {q.status === "ANSWERED" && q.answer && (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                    <p className="text-[11px] font-medium text-emerald-400 mb-0.5">
                      Trainer's answer
                    </p>
                    <p className="text-xs text-white/80">{q.answer}</p>
                  </div>
                )}

                {/* Inline answer form (host) */}
                {isHost && answeringId === q.id && (
                  <div className="space-y-1.5">
                    <Textarea
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      placeholder="Type your answer…"
                      aria-label="Type your answer"
                      className="min-h-[60px] resize-none border-white/10 bg-white/5 text-xs text-white placeholder:text-white/30 focus-visible:ring-emerald-500"
                      autoFocus
                    />
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        onClick={() => void handleAnswer(q)}
                        disabled={!answerText.trim()}
                        className="h-6 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white"
                      >
                        Post answer
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setAnsweringId(null); setAnswerText(""); }}
                        className="h-6 px-2 text-[11px] text-white/50 hover:bg-white/10 hover:text-white"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Action row */}
                <div className="flex items-center gap-2">
                  {/* Upvote — not for own questions */}
                  <button
                    onClick={() => handleUpvote(q)}
                    disabled={
                      q.askerIdentity === identity ||
                      q.upvoters.includes(identity)
                    }
                    className={cn(
                      "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                      q.upvoters.includes(identity)
                        ? "bg-primary/20 text-primary cursor-default"
                        : q.askerIdentity === identity
                        ? "text-white/20 cursor-default"
                        : "text-white/50 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <ChevronUp className="size-3.5" />
                    {q.upvotes}
                  </button>

                  {/* Host-only controls */}
                  {isHost && (
                    <div className="ms-auto flex items-center gap-1">
                      {/* Pin */}
                      <button
                        onClick={() => handlePin(q)}
                        title={q.status === "PINNED" ? "Unpin" : "Pin"}
                        aria-label={q.status === "PINNED" ? "Unpin question" : "Pin question"}
                        className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-amber-400 transition-colors"
                      >
                        {q.status === "PINNED" ? (
                          <PinOff className="size-3.5" />
                        ) : (
                          <Pin className="size-3.5" />
                        )}
                      </button>
                      {/* Answer */}
                      {q.status !== "ANSWERED" && q.status !== "ARCHIVED" && (
                        <button
                          onClick={() => {
                            setAnsweringId(q.id);
                            setAnswerText("");
                          }}
                          title="Answer"
                          aria-label="Answer this question"
                          className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-emerald-400 transition-colors"
                        >
                          <CheckCircle className="size-3.5" />
                        </button>
                      )}
                      {/* Archive */}
                      {q.status !== "ARCHIVED" && (
                        <button
                          onClick={() => handleArchive(q)}
                          title="Archive"
                          aria-label="Archive question"
                          className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white/70 transition-colors"
                        >
                          <Archive className="size-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Ask input — students only */}
      {!isHost && (
        <form
          onSubmit={handleAsk}
          className="shrink-0 border-t border-white/10 p-3"
        >
          <div className="flex gap-2">
            <Textarea
              value={askText}
              onChange={(e) => setAskText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleAsk(e as unknown as React.FormEvent);
                }
              }}
              placeholder="Ask a question…"
              aria-label="Ask a question"
              className="min-h-[60px] flex-1 resize-none border-white/10 bg-white/5 text-sm text-white placeholder:text-white/30 focus-visible:ring-primary"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!askText.trim() || sending}
              variant="ghost"
              className="h-auto self-end px-2 text-white/50 hover:bg-white/10 hover:text-white"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
