"use client";

import * as React from "react";
import { AlertTriangle, ExternalLink, Loader2, MessageCircle, PlugZap, ShieldX, Unplug } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  generateLinkToken,
  pollLinkStatus,
  disconnectTelegram,
  type TelegramStatus,
  type TelegramDisconnectReason,
} from "./actions";

const POLL_INTERVAL_MS = 3000;

// ── Connected state ───────────────────────────────────────────────────────────

function ConnectedState({
  username,
  onDisconnect,
}: {
  username: string | null;
  onDisconnect: () => void;
}) {
  const [pending, startTransition] = React.useTransition();

  const handleDisconnect = () => {
    startTransition(async () => {
      const res = await disconnectTelegram();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Telegram disconnected");
      onDisconnect();
    });
  };

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <MessageCircle className="size-4" />
        </div>
        <div>
          <p className="text-sm font-medium">Connected</p>
          <p className="text-xs text-muted-foreground">
            {username ? `@${username}` : "Telegram account linked"}
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleDisconnect}
        disabled={pending}
        className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
      >
        {pending ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Unplug />
        )}
        Disconnect
      </Button>
    </div>
  );
}

// ── Linking state ─────────────────────────────────────────────────────────────

function LinkingState({
  token,
  expiresAt,
  botUrl,
  onConnected,
  onCancel,
}: {
  token: string;
  expiresAt: string;
  botUrl: string;
  onConnected: (username: string | null) => void;
  onCancel: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = React.useState(() => {
    const ms = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(ms / 1000));
  });
  const [copied, setCopied] = React.useState(false);

  // Countdown timer
  React.useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Poll for connection
  React.useEffect(() => {
    if (secondsLeft === 0) return;
    const id = setInterval(async () => {
      const status = await pollLinkStatus();
      if (status.connected) {
        clearInterval(id);
        onConnected(status.username);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [secondsLeft, onConnected]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const expired = secondsLeft === 0;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">Connect Telegram</p>
        <p className="text-xs text-muted-foreground">
          Follow the steps below to link your Telegram account.
        </p>
      </div>

      <ol className="space-y-3 text-sm">
        <li className="flex gap-3">
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
            1
          </span>
          <span className="text-muted-foreground">
            {botUrl ? (
              <>
                Open{" "}
                <a
                  href={botUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 font-medium text-foreground underline underline-offset-2"
                >
                  the Webscale bot
                  <ExternalLink className="size-3" />
                </a>{" "}
                in Telegram.
              </>
            ) : (
              "Open the Webscale bot in Telegram."
            )}
          </span>
        </li>

        <li className="flex gap-3">
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
            2
          </span>
          <span className="text-muted-foreground">
            Send the command:
          </span>
        </li>
      </ol>

      {/* Token display */}
      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-4 py-3">
        <code className="flex-1 font-mono text-lg font-bold tracking-widest text-foreground">
          /link {token}
        </code>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="shrink-0 text-xs"
        >
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {expired ? (
            <span className="text-destructive">Token expired</span>
          ) : (
            <>
              <Loader2 className="size-3 animate-spin" />
              <span>
                Waiting for connection… expires in {mins}:{secs.toString().padStart(2, "0")}
              </span>
            </>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs">
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ── Disconnected (failure) state ──────────────────────────────────────────────

const DISCONNECT_COPY: Record<
  TelegramDisconnectReason,
  { icon: React.ElementType; message: string; cta: string | null }
> = {
  BLOCKED: {
    icon: ShieldX,
    message: "Your Telegram bot was blocked. Please unblock @WebscaleBot in Telegram and reconnect.",
    cta: "Reconnect Telegram",
  },
  DISABLED: {
    icon: Unplug,
    message: "Telegram notifications are disconnected.",
    cta: "Reconnect",
  },
  ERROR: {
    icon: AlertTriangle,
    message: "There was a problem with your Telegram connection. Please reconnect.",
    cta: "Reconnect",
  },
  REVOKED: {
    icon: ShieldX,
    message: "Your Telegram connection was revoked by an administrator.",
    cta: null,
  },
};

function DisconnectedState({
  reason,
  onReconnect,
}: {
  reason: TelegramDisconnectReason;
  onReconnect: () => void;
}) {
  const [pending, startTransition] = React.useTransition();
  const { icon: Icon, message, cta } = DISCONNECT_COPY[reason];

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <Icon className="size-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground/90">
            {reason === "REVOKED" ? "Connection revoked" : "Telegram disconnected"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{message}</p>
        </div>
      </div>
      {cta && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => startTransition(() => { onReconnect(); })}
          className="shrink-0"
        >
          {pending ? <Loader2 className="animate-spin" /> : <PlugZap />}
          {cta}
        </Button>
      )}
    </div>
  );
}

// ── Not connected state ───────────────────────────────────────────────────────

function NotConnectedState({ onStart }: { onStart: () => void }) {
  const [pending, startTransition] = React.useTransition();

  const handleConnect = () => {
    startTransition(async () => {
      onStart();
    });
  };

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
          <MessageCircle className="size-4" />
        </div>
        <div>
          <p className="text-sm font-medium">Not connected</p>
          <p className="text-xs text-muted-foreground">
            Receive task reminders, lead alerts, and session notifications in Telegram.
          </p>
        </div>
      </div>
      <Button size="sm" onClick={handleConnect} disabled={pending} className="shrink-0">
        {pending ? <Loader2 className="animate-spin" /> : <PlugZap />}
        Connect
      </Button>
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

type Phase =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "linking"; token: string; expiresAt: string; botUrl: string }
  | { type: "connected"; username: string | null }
  | { type: "disconnected"; reason: TelegramDisconnectReason };

export function TelegramSection({
  initialStatus,
}: {
  initialStatus: TelegramStatus;
}) {
  const [phase, setPhase] = React.useState<Phase>(() => {
    if (initialStatus.connected) {
      return { type: "connected", username: initialStatus.username };
    }
    if (initialStatus.disconnectReason) {
      return { type: "disconnected", reason: initialStatus.disconnectReason };
    }
    return { type: "idle" };
  });

  const startLinking = React.useCallback(async () => {
    setPhase({ type: "loading" });
    const res = await generateLinkToken();
    if (!res.ok) {
      toast.error(res.error);
      setPhase({ type: "idle" });
      return;
    }
    setPhase({
      type: "linking",
      token: res.data.token,
      expiresAt: res.data.expiresAt,
      botUrl: res.data.botUrl,
    });
  }, []);

  const handleConnected = React.useCallback((username: string | null) => {
    setPhase({ type: "connected", username });
    toast.success("Telegram connected!");
  }, []);

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <MessageCircle className="size-4 text-muted-foreground" />
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Telegram</h2>
          <p className="text-xs text-muted-foreground">
            Real-time notifications via Telegram bot.
          </p>
        </div>
      </div>

      {phase.type === "loading" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Generating link token…
        </div>
      )}

      {phase.type === "idle" && (
        <NotConnectedState onStart={startLinking} />
      )}

      {phase.type === "disconnected" && (
        <DisconnectedState
          reason={phase.reason}
          onReconnect={startLinking}
        />
      )}

      {phase.type === "linking" && (
        <LinkingState
          token={phase.token}
          expiresAt={phase.expiresAt}
          botUrl={phase.botUrl}
          onConnected={handleConnected}
          onCancel={() => setPhase({ type: "idle" })}
        />
      )}

      {phase.type === "connected" && (
        <ConnectedState
          username={phase.username}
          onDisconnect={() => setPhase({ type: "idle" })}
        />
      )}
    </div>
  );
}
