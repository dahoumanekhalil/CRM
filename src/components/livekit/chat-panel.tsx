"use client";

import * as React from "react";
import { useChat, useLocalParticipant } from "@livekit/components-react";
import { format } from "date-fns";
import { MicOff, Send, ShieldOff, UserX, VolumeX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/app/(app)/courses/[slug]/sessions/[sessionId]/live-session-actions";

// ── Chat-moderation wire protocol ─────────────────────────────────────────────
// Broadcast over LiveKit's reliable data channel so every participant applies
// the mute/unmute in real time. The blocked user's client also respects it so
// their send input becomes disabled.

type ChatModBlock = { type: "chat_block"; identity: string; name: string };
type ChatModUnblock = { type: "chat_unblock"; identity: string };
type ChatModSyncReq = { type: "chat_mod_sync_req" };
type ChatModSync = {
  type: "chat_mod_sync";
  blocked: { identity: string; name: string }[];
  banned: { identity: string; name: string }[];
};
// Full removal from the live session — the target's client shows a toast and
// disconnects. Server-side ban prevents rejoining (see ephemeral-bans.ts).
type ParticipantBan = { type: "participant_ban"; identity: string; name: string };
type ParticipantUnban = { type: "participant_unban"; identity: string };

export type ChatModMsg =
  | ChatModBlock
  | ChatModUnblock
  | ChatModSyncReq
  | ChatModSync
  | ParticipantBan
  | ParticipantUnban;

const MOD_MSG_TYPES = new Set([
  "chat_block",
  "chat_unblock",
  "chat_mod_sync_req",
  "chat_mod_sync",
  "participant_ban",
  "participant_unban",
]);

export function encodeChatModMsg(msg: ChatModMsg): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(JSON.stringify(msg)) as Uint8Array<ArrayBuffer>;
}

export function decodeChatModMsg(payload: Uint8Array): ChatModMsg | null {
  try {
    const parsed = JSON.parse(new TextDecoder().decode(payload)) as unknown;
    if (parsed !== null && typeof parsed === "object" && "type" in parsed) {
      const t = (parsed as { type: unknown }).type;
      if (typeof t === "string" && MOD_MSG_TYPES.has(t)) {
        return parsed as ChatModMsg;
      }
    }
  } catch {}
  return null;
}

// ── Chat bubble ───────────────────────────────────────────────────────────────

function ChatBubble({
  identity,
  name,
  body,
  sentAt,
  isMe,
  isHost,
  canModerate,
  isBlocked,
  isBanned,
  onBlock,
  onUnblock,
  onRemove,
}: {
  identity: string;
  name: string;
  body: string;
  sentAt: Date;
  isMe: boolean;
  isHost: boolean;
  canModerate: boolean;
  isBlocked: boolean;
  isBanned: boolean;
  onBlock?: (identity: string, name: string) => void;
  onUnblock?: (identity: string) => void;
  onRemove?: (identity: string, name: string) => void;
}) {
  return (
    <div className={cn("group/msg flex flex-col gap-0.5", isMe && "items-end")}>
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
        {isBanned && (
          <span className="inline-flex items-center gap-0.5 rounded-sm bg-red-500/25 px-1 py-px text-[9px] font-semibold uppercase tracking-wider text-red-200">
            <UserX className="size-2.5" />
            removed
          </span>
        )}
        {!isBanned && isBlocked && (
          <span className="inline-flex items-center gap-0.5 rounded-sm bg-red-500/15 px-1 py-px text-[9px] font-semibold uppercase tracking-wider text-red-300">
            <MicOff className="size-2.5" />
            muted
          </span>
        )}
      </div>
      <div className="flex items-end gap-1.5">
        {/* Moderator actions — appear on hover of an opponent's bubble.
            Two separate icons rather than a menu so both actions stay one click away. */}
        {canModerate && !isMe && (
          <div
            className={cn(
              "flex shrink-0 self-center items-center gap-0.5 opacity-0 transition group-hover/msg:opacity-100 focus-within:opacity-100",
              (isBlocked || isBanned) && "opacity-100"
            )}
          >
            <button
              type="button"
              onClick={() =>
                isBlocked
                  ? onUnblock?.(identity)
                  : onBlock?.(identity, name)
              }
              title={isBlocked ? `Unmute ${name}` : `Mute ${name} in chat`}
              aria-label={isBlocked ? `Unmute ${name}` : `Mute ${name} in chat`}
              className={cn(
                "rounded-md p-1 text-white/40 transition hover:bg-white/10 hover:text-white",
                isBlocked && "text-red-400 hover:text-red-300"
              )}
            >
              {isBlocked ? (
                <ShieldOff className="size-3.5" />
              ) : (
                <VolumeX className="size-3.5" />
              )}
            </button>
            {!isBanned && (
              <button
                type="button"
                onClick={() => onRemove?.(identity, name)}
                title={`Remove ${name} from the live session`}
                aria-label={`Remove ${name} from the live session`}
                className="rounded-md p-1 text-white/40 transition hover:bg-red-500/20 hover:text-red-300"
              >
                <UserX className="size-3.5" />
              </button>
            )}
          </div>
        )}
        <div
          className={cn(
            "max-w-[220px] break-words rounded-lg px-3 py-1.5 text-sm leading-snug",
            isMe
              ? "bg-primary/80 text-primary-foreground"
              : "bg-white/10 text-white",
            (isBlocked || isBanned) && "opacity-50"
          )}
        >
          {body}
        </div>
      </div>
    </div>
  );
}

// ── Moderation-actions chip (host-only, top of panel) ────────────────────────

function ModerationChip({
  icon,
  label,
  entries,
  tone,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  label: (n: number) => string;
  entries: Map<string, string>;
  tone: "amber" | "red";
  actionLabel: string;
  onAction: (identity: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  if (entries.size === 0) return null;

  const toneBg = tone === "red" ? "bg-red-500/5" : "bg-amber-500/5";
  const toneAction =
    tone === "red"
      ? "text-red-300 hover:text-red-200"
      : "text-amber-300 hover:text-amber-200";

  return (
    <div className={cn("shrink-0 border-b border-white/10 px-3 py-2", toneBg)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-xs text-white/70 hover:text-white"
      >
        {icon}
        <span className="font-medium">{label(entries.size)}</span>
        <span className="ms-auto text-[10px] text-white/40">
          {open ? "Hide" : "Show"}
        </span>
      </button>
      {open && (
        <ul className="mt-2 space-y-1">
          {Array.from(entries.entries()).map(([identity, name]) => (
            <li
              key={identity}
              className="flex items-center justify-between gap-2 rounded-md bg-white/5 px-2 py-1 text-xs text-white/80"
            >
              <span className="truncate">{name}</span>
              <button
                type="button"
                onClick={() => onAction(identity)}
                className={cn("shrink-0 text-[10px] font-medium", toneAction)}
              >
                {actionLabel}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Chat panel ────────────────────────────────────────────────────────────────

export function ChatPanel({
  liveSessionId,
  sendMessageAction,
  getChatHistoryAction,
  isHost = false,
  blockedIdentities,
  bannedIdentities,
  onBlock,
  onUnblock,
  onRemoveFromLive,
  onUnbanFromLive,
}: {
  liveSessionId: string;
  // Optional — when omitted, chat is ephemeral (live-channel only, no persistence).
  sendMessageAction?: (
    liveSessionId: string,
    body: string
  ) => Promise<{ ok: boolean; error?: string }>;
  getChatHistoryAction?: (
    liveSessionId: string,
    limit?: number
  ) => Promise<
    { ok: true; data: ChatMessage[] } | { ok: false; error: string }
  >;
  isHost?: boolean;
  // identity → display name
  blockedIdentities?: Map<string, string>;
  bannedIdentities?: Map<string, string>;
  onBlock?: (identity: string, name: string) => void;
  onUnblock?: (identity: string) => void;
  onRemoveFromLive?: (identity: string, name: string) => void;
  onUnbanFromLive?: (identity: string) => void;
}) {
  const { localParticipant } = useLocalParticipant();
  const { chatMessages, send: lkSend, isSending } = useChat();
  const [history, setHistory] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const myIdentity = localParticipant.identity;
  const blocked = blockedIdentities ?? new Map<string, string>();
  const banned = bannedIdentities ?? new Map<string, string>();
  const iAmBlocked = blocked.has(myIdentity);

  // Load history once on mount (only if persistence is configured).
  React.useEffect(() => {
    if (!getChatHistoryAction) return;
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
    if (!text || isSending || iAmBlocked) return;
    setInput("");
    // Broadcast via LiveKit data channel (real-time to all participants).
    await lkSend(text);
    // Persist server-side if the caller wired it up — fire-and-forget.
    if (sendMessageAction) void sendMessageAction(liveSessionId, text);
  }

  return (
    <aside className="absolute end-0 top-0 bottom-0 z-20 flex w-full sm:w-80 flex-col border-s border-white/10 bg-black/80 backdrop-blur-sm">
      {/* Header */}
      <div className="shrink-0 border-b border-white/10 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
          Chat
        </p>
      </div>

      {/* Moderation chips — host only */}
      {isHost && onUnblock && (
        <ModerationChip
          icon={<VolumeX className="size-3.5 text-amber-400" />}
          label={(n) => `${n} muted from chat`}
          entries={blocked}
          tone="amber"
          actionLabel="Unmute"
          onAction={onUnblock}
        />
      )}
      {isHost && onUnbanFromLive && (
        <ModerationChip
          icon={<UserX className="size-3.5 text-red-400" />}
          label={(n) => `${n} removed from live`}
          entries={banned}
          tone="red"
          actionLabel="Allow back"
          onAction={onUnbanFromLive}
        />
      )}

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* DB history (messages before this join) */}
        {history.map((msg) => {
          const bIsHost = msg.senderRole === "host";
          const isBlocked = blocked.has(msg.senderIdentity);
          const isBannedMsg = banned.has(msg.senderIdentity);
          return (
            <ChatBubble
              key={msg.id}
              identity={msg.senderIdentity}
              name={msg.senderName}
              body={msg.body}
              sentAt={msg.sentAt}
              isMe={msg.senderIdentity === myIdentity}
              isHost={bIsHost}
              canModerate={isHost}
              isBlocked={isBlocked}
              isBanned={isBannedMsg}
              onBlock={onBlock}
              onUnblock={onUnblock}
              onRemove={onRemoveFromLive}
            />
          );
        })}

        {/* Divider between history and live */}
        {history.length > 0 && chatMessages.length > 0 && (
          <div className="flex items-center gap-2 py-1">
            <div className="flex-1 border-t border-white/10" />
            <span className="text-[10px] text-white/30">live</span>
            <div className="flex-1 border-t border-white/10" />
          </div>
        )}

        {/* Real-time messages (LiveKit data channel) */}
        {chatMessages.map((msg) => {
          const senderIdentity = msg.from?.identity ?? "";
          const isBlocked = blocked.has(senderIdentity);
          const isBannedMsg = banned.has(senderIdentity);
          // Defense in depth: drop messages from restricted participants entirely
          // (unless it's my own message so I still see what I tried to say),
          // and unless I'm a host so I can see moderation context.
          const hidden = (isBlocked || isBannedMsg) && !isHost && senderIdentity !== myIdentity;
          if (hidden) return null;
          return (
            <ChatBubble
              key={msg.id}
              identity={senderIdentity}
              name={msg.from?.name || senderIdentity || "Participant"}
              body={msg.message}
              sentAt={new Date(msg.timestamp)}
              isMe={msg.from?.isLocal ?? false}
              isHost={senderIdentity.startsWith("host_")}
              canModerate={isHost}
              isBlocked={isBlocked}
              isBanned={isBannedMsg}
              onBlock={onBlock}
              onUnblock={onUnblock}
              onRemove={onRemoveFromLive}
            />
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input — replaced with a muted banner when I've been blocked */}
      {iAmBlocked ? (
        <div className="shrink-0 flex items-center gap-2 border-t border-white/10 bg-red-500/10 px-3 py-3 text-xs text-red-200">
          <MicOff className="size-3.5 shrink-0" />
          <span>
            A moderator has muted you in this chat. You can still read messages.
          </span>
        </div>
      ) : (
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
      )}
    </aside>
  );
}
