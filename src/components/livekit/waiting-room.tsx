"use client";

import * as React from "react";
import {
  useLocalParticipant,
  useParticipants,
} from "@livekit/components-react";
import { ParticipantEvent } from "livekit-client";
import { Check, Loader2, UserCheck, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

// ── Metadata helpers ──────────────────────────────────────────────────────────

function getMetaStatus(metadata: string | undefined): string | null {
  if (!metadata) return null;
  try {
    const parsed = JSON.parse(metadata) as { status?: string };
    return parsed.status ?? null;
  } catch {
    return null;
  }
}

// ── Waiting View (student side) ───────────────────────────────────────────────

export function WaitingView() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-[#111] text-white">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-white/10">
        <Loader2 className="size-8 animate-spin text-white/60" />
      </div>
      <div className="space-y-2 text-center">
        <p className="text-lg font-semibold">Waiting to be admitted</p>
        <p className="max-w-xs text-sm text-white/50">
          The trainer will let you in shortly. Please keep this window open.
        </p>
      </div>
    </div>
  );
}

// ── StudentWaitingWrapper — listens for admission via metadata ────────────────

export function StudentWaitingWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { localParticipant } = useLocalParticipant();
  const [admitted, setAdmitted] = React.useState(
    () => getMetaStatus(localParticipant.metadata) === "admitted"
  );

  React.useEffect(() => {
    function onMetaChanged() {
      if (getMetaStatus(localParticipant.metadata) === "admitted") {
        setAdmitted(true);
        toast.success("You have been admitted to the session.");
      }
    }

    localParticipant.on(ParticipantEvent.ParticipantMetadataChanged, onMetaChanged);
    return () => {
      localParticipant.off(ParticipantEvent.ParticipantMetadataChanged, onMetaChanged);
    };
  }, [localParticipant]);

  if (!admitted) return <WaitingView />;
  return <>{children}</>;
}

// ── WaitingParticipantsList — host overlay showing pending students ────────────

export function WaitingParticipantsList({
  liveSessionId,
  admitAction,
  rejectAction,
}: {
  liveSessionId: string;
  admitAction: (
    liveSessionId: string,
    identity: string
  ) => Promise<{ ok: boolean; error?: string }>;
  rejectAction: (
    liveSessionId: string,
    identity: string
  ) => Promise<{ ok: boolean; error?: string }>;
}) {
  const participants = useParticipants();
  const [pending, setPending] = React.useState<Record<string, boolean>>({});

  const waitingList = participants.filter(
    (p) =>
      !p.isLocal &&
      p.identity.startsWith("student_") &&
      getMetaStatus(p.metadata) === "waiting"
  );

  if (waitingList.length === 0) return null;

  async function handleAdmit(identity: string) {
    setPending((s) => ({ ...s, [identity]: true }));
    const res = await admitAction(liveSessionId, identity);
    setPending((s) => ({ ...s, [identity]: false }));
    if (!res.ok) toast.error(res.error ?? "Failed to admit participant.");
  }

  async function handleReject(identity: string) {
    setPending((s) => ({ ...s, [identity]: true }));
    const res = await rejectAction(liveSessionId, identity);
    setPending((s) => ({ ...s, [identity]: false }));
    if (!res.ok) toast.error(res.error ?? "Failed to remove participant.");
  }

  return (
    <div className="absolute end-4 top-4 z-30 w-72 overflow-hidden rounded-xl border border-white/10 bg-black/85 shadow-2xl backdrop-blur-sm">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <UserCheck className="size-4 text-amber-400" />
        <span className="text-sm font-medium text-white">
          Waiting Room
        </span>
        <span className="ms-auto rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400">
          {waitingList.length}
        </span>
      </div>
      <ul className="max-h-64 divide-y divide-white/5 overflow-y-auto">
        {waitingList.map((p) => (
          <li
            key={p.identity}
            className="flex items-center justify-between gap-3 px-4 py-2.5"
          >
            <span className="truncate text-sm text-white/80">
              {p.name || p.identity}
            </span>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                disabled={!!pending[p.identity]}
                onClick={() => void handleAdmit(p.identity)}
                className="h-7 w-7 p-0 text-green-400 hover:bg-green-500/20 hover:text-green-300"
                title="Admit"
                aria-label="Admit"
              >
                {pending[p.identity] ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={!!pending[p.identity]}
                onClick={() => void handleReject(p.identity)}
                className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                title="Reject"
                aria-label="Reject"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
