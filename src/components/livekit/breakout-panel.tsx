"use client";

import * as React from "react";
import { Users2, Plus, Minus, Play, Square, Shuffle } from "lucide-react";
import { useParticipants, useLocalParticipant } from "@livekit/components-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BreakoutRoomRow } from "@/app/(app)/courses/[slug]/sessions/[sessionId]/live-session-actions";

// ── Data channel wire protocol ─────────────────────────────────────────────────

export type BrkMsg =
  | { type: "brk_assign"; assignments: Record<string, { breakoutRoomId: string; roomName: string }> }
  | { type: "brk_end" };

export function encodeBrkMsg(msg: BrkMsg): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(JSON.stringify(msg)) as Uint8Array<ArrayBuffer>;
}

export function decodeBrkMsg(payload: Uint8Array): BrkMsg | null {
  try {
    const json = JSON.parse(new TextDecoder().decode(payload));
    if (json?.type === "brk_assign" || json?.type === "brk_end") return json as BrkMsg;
    return null;
  } catch {
    return null;
  }
}

// ── Room color palette ────────────────────────────────────────────────────────

const ROOM_COLORS = [
  "bg-violet-500/20 border-violet-500/30 text-violet-300",
  "bg-blue-500/20 border-blue-500/30 text-blue-300",
  "bg-emerald-500/20 border-emerald-500/30 text-emerald-300",
  "bg-amber-500/20 border-amber-500/30 text-amber-300",
  "bg-rose-500/20 border-rose-500/30 text-rose-300",
  "bg-cyan-500/20 border-cyan-500/30 text-cyan-300",
];

// ── BreakoutPanel ─────────────────────────────────────────────────────────────

export function BreakoutPanel({
  liveSessionId,
  createRoomsAction,
  saveAssignmentsAction,
  closeRoomsAction,
  onBroadcastAssign,
  onBroadcastEnd,
}: {
  liveSessionId: string;
  createRoomsAction: (
    liveSessionId: string,
    count: number
  ) => Promise<{ ok: boolean; data?: BreakoutRoomRow[]; error?: string }>;
  saveAssignmentsAction: (
    assignments: { breakoutRoomId: string; identity: string; displayName: string }[]
  ) => Promise<{ ok: boolean; error?: string }>;
  closeRoomsAction: (
    liveSessionId: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onBroadcastAssign: (msg: BrkMsg) => void;
  onBroadcastEnd: () => void;
}) {
  const allParticipants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  // Students only (exclude host itself)
  const students = allParticipants.filter(
    (p) => !p.isLocal && p.identity.startsWith("student_")
  );

  const [roomCount, setRoomCount] = React.useState(2);
  const [rooms, setRooms] = React.useState<BreakoutRoomRow[]>([]);
  // assignments: identity → breakoutRoomId
  const [assignments, setAssignments] = React.useState<Record<string, string>>({});
  const [active, setActive] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [starting, setStarting] = React.useState(false);
  const [ending, setEnding] = React.useState(false);

  async function handleCreate() {
    setCreating(true);
    const res = await createRoomsAction(liveSessionId, roomCount);
    if (res.ok && res.data) {
      setRooms(res.data);
      setAssignments({});
      setActive(false);
    } else {
      toast.error(res.error ?? "Failed to create breakout rooms.");
    }
    setCreating(false);
  }

  function handleAutoAssign() {
    if (rooms.length === 0) return;
    const next: Record<string, string> = {};
    students.forEach((s, i) => {
      next[s.identity] = rooms[i % rooms.length].id;
    });
    setAssignments(next);
  }

  function assignParticipant(identity: string, breakoutRoomId: string) {
    setAssignments((prev) => ({ ...prev, [identity]: breakoutRoomId }));
  }

  async function handleStart() {
    if (rooms.length === 0) return;

    const assignList = Object.entries(assignments).map(([identity, breakoutRoomId]) => {
      const p = allParticipants.find((x) => x.identity === identity);
      return {
        breakoutRoomId,
        identity,
        displayName: p?.name ?? identity,
      };
    });

    setStarting(true);
    const saved = await saveAssignmentsAction(assignList);
    if (!saved.ok) {
      toast.error(saved.error ?? "Failed to save assignments.");
      setStarting(false);
      return;
    }

    // Build map: identity → { breakoutRoomId, roomName }
    const roomMap: Record<string, { breakoutRoomId: string; roomName: string }> = {};
    for (const [identity, breakoutRoomId] of Object.entries(assignments)) {
      const room = rooms.find((r) => r.id === breakoutRoomId);
      if (room) roomMap[identity] = { breakoutRoomId, roomName: room.roomName };
    }

    onBroadcastAssign({ type: "brk_assign", assignments: roomMap });
    setActive(true);
    setStarting(false);
    toast.success("Breakout rooms started — students are being moved.");
  }

  async function handleEnd() {
    setEnding(true);
    const res = await closeRoomsAction(liveSessionId);
    if (!res.ok) {
      toast.error(res.error ?? "Failed to close breakout rooms.");
      setEnding(false);
      return;
    }

    onBroadcastEnd();
    setActive(false);
    setRooms([]);
    setAssignments({});
    setEnding(false);
    toast.success("Breakout rooms closed — everyone returned to main room.");
  }

  const unassigned = students.filter((s) => !assignments[s.identity]);

  return (
    <div className="flex w-full shrink-0 flex-col border-s border-white/10 bg-black/40 md:w-72 max-h-60 md:max-h-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="text-sm font-medium text-white">Breakout Rooms</span>
        {active ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={ending}
            onClick={handleEnd}
            className="h-6 gap-1 px-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
          >
            <Square className="size-3" />
            End All
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            disabled={rooms.length === 0 || starting}
            onClick={handleStart}
            className="h-6 gap-1 px-2 text-xs text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 disabled:opacity-40"
          >
            <Play className="size-3" />
            Start
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Room count selector (only when not active) */}
        {!active && (
          <div className="border-b border-white/10 px-4 py-3">
            <p className="mb-2 text-xs text-white/50">Number of rooms</p>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="ghost"
                className="size-7 p-0 text-white/60 hover:bg-white/10"
                onClick={() => setRoomCount((v) => Math.max(2, v - 1))}
                disabled={roomCount <= 2}
                aria-label="Decrease room count"
              >
                <Minus className="size-3.5" />
              </Button>
              <span className="w-4 text-center text-sm font-medium text-white">
                {roomCount}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="size-7 p-0 text-white/60 hover:bg-white/10"
                onClick={() => setRoomCount((v) => Math.min(6, v + 1))}
                disabled={roomCount >= 6}
                aria-label="Increase room count"
              >
                <Plus className="size-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={creating}
                onClick={handleCreate}
                className="ms-auto h-7 px-2 text-xs text-white/70 hover:bg-white/10 hover:text-white"
              >
                {creating ? "Creating…" : rooms.length > 0 ? "Recreate" : "Create"}
              </Button>
            </div>
          </div>
        )}

        {/* Rooms + assignments */}
        {rooms.length > 0 && (
          <div className="px-4 py-3 space-y-3">
            {rooms.map((room, idx) => {
              const assigned = students.filter(
                (s) => assignments[s.identity] === room.id
              );
              return (
                <div
                  key={room.id}
                  className={cn(
                    "rounded-lg border px-3 py-2",
                    ROOM_COLORS[idx % ROOM_COLORS.length]
                  )}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-medium">{room.name}</span>
                    <span className="text-[10px] opacity-60">
                      {assigned.length} student{assigned.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {assigned.length > 0 ? (
                    <div className="space-y-1">
                      {assigned.map((s) => (
                        <div
                          key={s.identity}
                          className="flex items-center justify-between gap-1"
                        >
                          <span className="truncate text-[11px] opacity-80">
                            {s.name || s.identity}
                          </span>
                          {!active && (
                            <button
                              className="shrink-0 text-[10px] opacity-50 hover:opacity-100"
                              aria-label={`Remove ${s.name || s.identity} from room`}
                              onClick={() =>
                                setAssignments((prev) => {
                                  const next = { ...prev };
                                  delete next[s.identity];
                                  return next;
                                })
                              }
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] opacity-40">Empty</p>
                  )}
                </div>
              );
            })}

            {/* Unassigned students */}
            {!active && unassigned.length > 0 && (
              <div className="rounded-lg border border-white/10 px-3 py-2">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-medium text-white/60">Unassigned</span>
                  <button
                    className="text-[10px] text-white/40 hover:text-white/70"
                    onClick={handleAutoAssign}
                  >
                    <Shuffle className="inline size-3" /> Auto
                  </button>
                </div>
                <div className="space-y-1">
                  {unassigned.map((s) => (
                    <div key={s.identity} className="flex items-center gap-1">
                      <span className="min-w-0 flex-1 truncate text-[11px] text-white/60">
                        {s.name || s.identity}
                      </span>
                      <select
                        className="h-5 rounded border border-white/20 bg-white/10 px-1 text-[10px] text-white"
                        defaultValue=""
                        aria-label={`Assign ${s.name || s.identity} to room`}
                        onChange={(e) => {
                          if (e.target.value)
                            assignParticipant(s.identity, e.target.value);
                        }}
                      >
                        <option value="" disabled>
                          Room…
                        </option>
                        {rooms.map((r) => (
                          <option key={r.id} value={r.id} className="bg-zinc-900">
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {rooms.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center px-4">
            <Users2 className="size-8 text-white/20" />
            <p className="text-xs text-white/40">
              Create rooms and assign students to start a breakout session.
            </p>
          </div>
        )}
      </div>

      {/* Active status banner */}
      {active && (
        <div className="border-t border-white/10 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-emerald-400">Breakout in progress</span>
          </div>
        </div>
      )}
    </div>
  );
}
