"use client";

import * as React from "react";
import { useChat, useLocalParticipant } from "@livekit/components-react";
import { format } from "date-fns";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/app/(app)/courses/[slug]/sessions/[sessionId]/live-session-actions";

// ── Chat bubble ───────────────────────────────────────────────────────────────

function ChatBubble({
  name,
  body,
  sentAt,
  isMe,
  isHost,
}: {
  name: string;
  body: string;
  sentAt: Date;
  isMe: boolean;
  isHost: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", isMe && "items-end")}>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "text-xs font-medium",
            isHost ? "text-amber-400" : "text-white/60"
          )}
        >
          {name}
        </span>
        <span className="text-[10px] text-white/30">
          {format(sentAt, "HH:mm")}
        </span>
      </div>
      <div
        className={cn(
          "max-w-[220px] break-words rounded-lg px-3 py-1.5 text-sm leading-snug",
          isMe
            ? "bg-primary/80 text-primary-foreground"
            : "bg-white/10 text-white"
        )}
      >
        {body}
      </div>
    </div>
  );
}

// ── Chat panel ────────────────────────────────────────────────────────────────

export function ChatPanel({
  liveSessionId,
  sendMessageAction,
  getChatHistoryAction,
}: {
  liveSessionId: string;
  sendMessageAction: (
    liveSessionId: string,
    body: string
  ) => Promise<{ ok: boolean; error?: string }>;
  getChatHistoryAction: (
    liveSessionId: string,
    limit?: number
  ) => Promise<
    | { ok: true; data: ChatMessage[] }
    | { ok: false; error: string }
  >;
}) {
  const { localParticipant } = useLocalParticipant();
  const { chatMessages, send: lkSend, isSending } = useChat();
  const [history, setHistory] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const bottomRef = React.useRef<HTMLDivElement>(null);

  // Load history once on mount.
  React.useEffect(() => {
    getChatHistoryAction(liveSessionId).then((res) => {
      if (res.ok) setHistory(res.data);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveSessionId]);

  // Auto-scroll when messages arrive.
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length, history.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;
    setInput("");
    // Broadcast via LiveKit data channel (real-time to all participants).
    await lkSend(text);
    // Persist server-side — fire-and-forget.
    void sendMessageAction(liveSessionId, text);
  }

  const myIdentity = localParticipant.identity;

  return (
    <aside className="absolute end-0 top-0 bottom-0 z-20 flex w-full sm:w-80 flex-col border-s border-white/10 bg-black/80 backdrop-blur-sm">
      {/* Header */}
      <div className="shrink-0 border-b border-white/10 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
          Chat
        </p>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* DB history (messages before this join) */}
        {history.map((msg) => (
          <ChatBubble
            key={msg.id}
            name={msg.senderName}
            body={msg.body}
            sentAt={msg.sentAt}
            isMe={msg.senderIdentity === myIdentity}
            isHost={msg.senderRole === "host"}
          />
        ))}

        {/* Divider between history and live */}
        {history.length > 0 && chatMessages.length > 0 && (
          <div className="flex items-center gap-2 py-1">
            <div className="flex-1 border-t border-white/10" />
            <span className="text-[10px] text-white/30">live</span>
            <div className="flex-1 border-t border-white/10" />
          </div>
        )}

        {/* Real-time messages (LiveKit data channel) */}
        {chatMessages.map((msg) => (
          <ChatBubble
            key={msg.id}
            name={msg.from?.name ?? msg.from?.identity ?? "Participant"}
            body={msg.message}
            sentAt={new Date(msg.timestamp)}
            isMe={msg.from?.isLocal ?? false}
            isHost={msg.from?.identity?.startsWith("host_") ?? false}
          />
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="shrink-0 flex gap-2 border-t border-white/10 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Send a message…"
          maxLength={2000}
          aria-label="Message"
          className="min-w-0 flex-1 rounded-md bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:bg-white/15"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!input.trim() || isSending}
          variant="ghost"
          className="h-9 w-9 shrink-0 p-0 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-40"
        >
          <Send className="size-4" />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </aside>
  );
}
