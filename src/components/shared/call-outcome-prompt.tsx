"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Clock,
  GraduationCap,
  PhoneMissed,
  PhoneOff,
  ThumbsDown,
  ThumbsUp,
  Voicemail,
  X,
  HelpCircle,
  Loader2,
  PhoneCall,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createCommunication } from "@/app/(app)/communications/actions";
import { bulkUpdateLeadStatus } from "@/app/(app)/leads/actions";
import type { LeadStatus } from "@/lib/schemas/lead";

// ── localStorage helpers ──────────────────────────────────────────────────────

export interface PendingCall {
  leadId: string;
  leadName: string;
  phone: string;
  startedAt: number; // Date.now()
}

const STORAGE_KEY = "webscale_pending_call";
const CALL_EXPIRY_MS = 30 * 60 * 1000; // ignore calls older than 30 min

export function savePendingCall(data: PendingCall) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function loadPendingCall(): PendingCall | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PendingCall;
    if (Date.now() - data.startedAt > CALL_EXPIRY_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function clearPendingCall() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

// ── Outcome definitions ───────────────────────────────────────────────────────

interface Outcome {
  id: string;
  label: string;
  icon: typeof PhoneCall;
  status: LeadStatus | null;
  summary: string;
  color: string;
}

const OUTCOMES: Outcome[] = [
  {
    id: "interested",
    label: "Interested",
    icon: ThumbsUp,
    status: "INTERESTED",
    summary: "Answered — interested in the course",
    color: "border-success/40 bg-success/5 text-success hover:bg-success/10",
  },
  {
    id: "agreed_register",
    label: "Agreed to register",
    icon: GraduationCap,
    status: "INTERESTED",
    summary: "Answered — agreed to register",
    color: "border-success/40 bg-success/5 text-success hover:bg-success/10",
  },
  {
    id: "thinking",
    label: "Will think about it",
    icon: HelpCircle,
    status: "INTERESTED",
    summary: "Answered — needs time to think, follow up later",
    color: "border-warning/40 bg-warning/5 text-warning hover:bg-warning/10",
  },
  {
    id: "callback",
    label: "Call me back later",
    icon: Clock,
    status: "INTERESTED",
    summary: "Answered — asked to call back at another time",
    color: "border-warning/40 bg-warning/5 text-warning hover:bg-warning/10",
  },
  {
    id: "no_answer",
    label: "No answer",
    icon: PhoneMissed,
    status: "CONTACTED",
    summary: "No answer",
    color: "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60",
  },
  {
    id: "voicemail",
    label: "Left voicemail",
    icon: Voicemail,
    status: "CONTACTED",
    summary: "Left a voicemail",
    color: "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60",
  },
  {
    id: "not_interested",
    label: "Not interested",
    icon: ThumbsDown,
    status: "LOST",
    summary: "Answered — not interested",
    color: "border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10",
  },
  {
    id: "wrong_number",
    label: "Wrong number",
    icon: PhoneOff,
    status: null,
    summary: "Wrong number",
    color: "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60",
  },
];

// ── Main component ────────────────────────────────────────────────────────────

export function CallOutcomePrompt() {
  const router = useRouter();
  const [pending, setPending] = React.useState<PendingCall | null>(null);
  const [selected, setSelected] = React.useState<Outcome | null>(null);
  const [notes, setNotes] = React.useState("");
  const [saving, startSave] = React.useTransition();

  // Show the prompt when the user comes back to the page after a call.
  React.useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        const call = loadPendingCall();
        if (call) setPending(call);
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    // Also check immediately in case the page was already visible on mount.
    const call = loadPendingCall();
    if (call) setPending(call);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  function dismiss() {
    clearPendingCall();
    setPending(null);
    setSelected(null);
    setNotes("");
  }

  function handleSave() {
    if (!pending || !selected) return;
    startSave(async () => {
      const body = [selected.summary, notes.trim()].filter(Boolean).join("\n\n");

      const [commRes, statusRes] = await Promise.all([
        createCommunication({
          type: "CALL",
          direction: "OUTBOUND",
          subject: "",
          body,
          sentAt: new Date(pending.startedAt).toISOString().slice(0, 16),
          leadId: pending.leadId,
        }),
        selected.status
          ? bulkUpdateLeadStatus([pending.leadId], selected.status)
          : Promise.resolve({ ok: true, data: { count: 0 } }),
      ]);

      if (!commRes.ok) {
        toast.error(commRes.error);
        return;
      }
      if ("ok" in statusRes && !statusRes.ok) {
        toast.error((statusRes as { ok: false; error: string }).error);
        return;
      }

      toast.success("Call logged" + (selected.status ? ` · Lead marked as ${selected.status.toLowerCase().replace("_", " ")}` : ""));
      dismiss();
      router.refresh();
    });
  }

  if (!pending) return null;

  return (
    // Backdrop (subtle, non-blocking)
    <div className="fixed inset-x-0 bottom-0 z-50 flex items-end justify-center p-4 sm:items-end sm:justify-end sm:p-6 pointer-events-none">
      <div
        className="pointer-events-auto w-full max-w-sm animate-in slide-in-from-bottom-4 duration-300 rounded-2xl border border-border bg-card shadow-2xl shadow-black/20"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-full bg-primary/10">
              <PhoneCall className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">How did the call go?</p>
              <p className="text-xs text-muted-foreground">{pending.leadName} · {pending.phone}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="mt-0.5 grid size-6 place-items-center rounded text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Outcomes grid */}
        <div className="grid grid-cols-2 gap-2 p-3">
          {OUTCOMES.map((o) => {
            const Icon = o.icon;
            const active = selected?.id === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setSelected(active ? null : o)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-start text-xs font-medium transition-all",
                  active
                    ? cn(o.color, "ring-2 ring-current ring-offset-1")
                    : cn(o.color, "opacity-80")
                )}
              >
                <Icon className="size-3.5 shrink-0" />
                {o.label}
              </button>
            );
          })}
        </div>

        {/* Notes + Save (visible after picking an outcome) */}
        {selected && (
          <div className="space-y-3 border-t border-border/60 px-3 pb-3 pt-3 animate-in fade-in-0 slide-in-from-top-1 duration-150">
            <Textarea
              rows={2}
              placeholder="Add notes (optional)…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none text-sm"
            />
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={dismiss}
                className="text-muted-foreground"
                disabled={saving}
              >
                Skip
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <Loader2 className="animate-spin" /> : null}
                Save outcome
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
