"use client";

import * as React from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  MessageSquare,
  Send,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  sendBroadcast,
  type BroadcastHistoryRow,
  type ConnectedAccount,
  type BroadcastTargetType,
} from "./actions";

// ── Role meta ─────────────────────────────────────────────────────────────────

const ROLES = [
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "SALES", label: "Sales" },
  { value: "MARKETING", label: "Marketing" },
  { value: "TRAINER", label: "Trainer" },
  { value: "FINANCE", label: "Finance" },
  { value: "EMPLOYEE", label: "Employee" },
] as const;

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  MANAGER: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  SALES: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  MARKETING: "bg-pink-500/10 text-pink-700 dark:text-pink-400",
  TRAINER: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  FINANCE: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  EMPLOYEE: "bg-muted text-muted-foreground",
};

const MAX_LEN = 4096;

// ── Telegram-style message preview ────────────────────────────────────────────

function TelegramPreview({ text }: { text: string }) {
  if (!text.trim()) return null;
  return (
    <div className="rounded-xl bg-[#17212b] p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#2b5278] text-xs font-bold text-white">
          W
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-xs font-semibold text-[#6fb4f0]">WEBSCALE CRM</p>
          <div
            className="break-words text-sm text-[#e8e8e8] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: text.replace(/\n/g, "<br>") }}
          />
          <p className="mt-1 text-end text-[10px] text-[#6e7d8a]">
            {format(new Date(), "h:mm a")}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Composer ──────────────────────────────────────────────────────────────────

function Composer({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [hintOpen, setHintOpen] = React.useState(false);
  const len = value.length;
  const over = len > MAX_LEN;

  return (
    <div className="space-y-3">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write your message here…"
        rows={8}
        className={cn(
          "w-full resize-none rounded-xl border bg-background px-4 py-3 text-sm leading-relaxed outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
          over ? "border-destructive" : "border-input"
        )}
      />

      <div className="flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={() => setHintOpen((o) => !o)}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          {hintOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          HTML formatting supported
        </button>
        <span className={cn("tabular-nums", over ? "text-destructive font-medium" : "text-muted-foreground")}>
          {len.toLocaleString()} / {MAX_LEN.toLocaleString()}
        </span>
      </div>

      {hintOpen && (
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs space-y-1.5 text-muted-foreground">
          {[
            ["<b>text</b>", "Bold"],
            ["<i>text</i>", "Italic"],
            ["<u>text</u>", "Underline"],
            ["<s>text</s>", "Strikethrough"],
            ["<code>text</code>", "Monospace"],
            ["<a href=\"URL\">label</a>", "Link"],
          ].map(([tag, label]) => (
            <div key={tag} className="flex items-center gap-2">
              <code className="rounded bg-muted px-1 py-0.5 text-[11px] text-foreground">{tag}</code>
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}

      {value.trim() && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Preview</p>
          <TelegramPreview text={value} />
        </div>
      )}
    </div>
  );
}

// ── Recipients panel ──────────────────────────────────────────────────────────

function RecipientPanel({
  accounts,
  targetType,
  setTargetType,
  selectedRoles,
  setSelectedRoles,
  selectedUserIds,
  setSelectedUserIds,
}: {
  accounts: ConnectedAccount[];
  targetType: BroadcastTargetType;
  setTargetType: (t: BroadcastTargetType) => void;
  selectedRoles: string[];
  setSelectedRoles: (r: string[]) => void;
  selectedUserIds: string[];
  setSelectedUserIds: (ids: string[]) => void;
}) {
  const [userSearch, setUserSearch] = React.useState("");

  const byRole = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const a of accounts) {
      map.set(a.role, (map.get(a.role) ?? 0) + 1);
    }
    return map;
  }, [accounts]);

  const filteredUsers = React.useMemo(
    () =>
      accounts.filter((a) => {
        const q = userSearch.toLowerCase();
        return (
          !q ||
          a.name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          (a.username ?? "").toLowerCase().includes(q)
        );
      }),
    [accounts, userSearch]
  );

  function toggleRole(role: string) {
    setSelectedRoles(
      selectedRoles.includes(role)
        ? selectedRoles.filter((r) => r !== role)
        : [...selectedRoles, role]
    );
  }

  function toggleUser(id: string) {
    setSelectedUserIds(
      selectedUserIds.includes(id)
        ? selectedUserIds.filter((u) => u !== id)
        : [...selectedUserIds, id]
    );
  }

  const options: { value: BroadcastTargetType; label: string; count: number }[] = [
    { value: "all", label: "All connected accounts", count: accounts.length },
    { value: "roles", label: "Filter by role", count: selectedRoles.reduce((s, r) => s + (byRole.get(r) ?? 0), 0) },
    { value: "users", label: "Select specific users", count: selectedUserIds.length },
  ];

  return (
    <div className="space-y-4">
      {/* Target mode radio */}
      <div className="space-y-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              "flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition-colors",
              targetType === opt.value
                ? "border-primary/50 bg-primary/5"
                : "border-border/60 hover:border-border hover:bg-muted/30"
            )}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="targetType"
                value={opt.value}
                checked={targetType === opt.value}
                onChange={() => setTargetType(opt.value)}
                className="accent-primary"
              />
              <span className="text-sm font-medium">{opt.label}</span>
            </div>
            {targetType === opt.value && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  opt.count > 0
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {opt.count}
              </span>
            )}
          </label>
        ))}
      </div>

      {/* Role checkboxes */}
      {targetType === "roles" && (
        <div className="space-y-2 ps-1">
          <p className="text-xs text-muted-foreground">Select one or more roles:</p>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((role) => {
              const count = byRole.get(role.value) ?? 0;
              if (count === 0) return null;
              const checked = selectedRoles.includes(role.value);
              return (
                <label
                  key={role.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors",
                    checked
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/50 hover:border-border"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleRole(role.value)}
                    className="accent-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium">{role.label}</p>
                    <p className="text-[11px] text-muted-foreground">{count} connected</p>
                  </div>
                </label>
              );
            })}
          </div>
          {selectedRoles.length === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <AlertCircle className="size-3.5" /> Select at least one role
            </p>
          )}
        </div>
      )}

      {/* User picker */}
      {targetType === "users" && (
        <div className="space-y-2 ps-1">
          <input
            type="text"
            placeholder="Search by name, email or @username…"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="flex h-8 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/40"
          />
          {selectedUserIds.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{selectedUserIds.length} selected</span>
              <button
                type="button"
                onClick={() => setSelectedUserIds([])}
                className="hover:text-destructive transition-colors"
              >
                clear
              </button>
            </div>
          )}
          <div className="max-h-60 space-y-1 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No connected accounts found.</p>
            ) : (
              filteredUsers.map((account) => {
                const checked = selectedUserIds.includes(account.userId);
                return (
                  <label
                    key={account.userId}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                      checked
                        ? "border-primary/40 bg-primary/5"
                        : "border-border/40 hover:border-border hover:bg-muted/20"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleUser(account.userId)}
                      className="accent-primary"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{account.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {account.username ? `@${account.username}` : account.email}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        ROLE_COLORS[account.role] ?? "bg-muted text-muted-foreground"
                      )}
                    >
                      {ROLES.find((r) => r.value === account.role)?.label ?? account.role}
                    </span>
                  </label>
                );
              })
            )}
          </div>
          {selectedUserIds.length === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <AlertCircle className="size-3.5" /> Select at least one user
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Broadcast history ─────────────────────────────────────────────────────────

function HistoryTable({ rows }: { rows: BroadcastHistoryRow[] }) {
  const [expanded, setExpanded] = React.useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border/60 py-12 text-center">
        <MessageSquare className="size-8 text-muted-foreground/40" />
        <div>
          <p className="text-sm font-medium">No broadcasts yet</p>
          <p className="text-xs text-muted-foreground">Messages you send will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/40">
            <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground">Sent</th>
            <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground">By</th>
            <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground">Recipients</th>
            <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground">Delivered</th>
            <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground">Message</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <React.Fragment key={row.id}>
              <tr
                className={cn(
                  "cursor-pointer transition-colors hover:bg-muted/30",
                  i > 0 && "border-t border-border/40",
                  expanded === row.id && "bg-muted/20"
                )}
                onClick={() => setExpanded(expanded === row.id ? null : row.id)}
              >
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs font-medium">{row.sentByName}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="size-3.5" />
                    {row.recipientCount}
                    {row.targetType === "roles" && row.targetRoles.length > 0 && (
                      <span className="text-[10px]">
                        ({row.targetRoles.map((r) => ROLES.find((x) => x.value === r)?.label ?? r).join(", ")})
                      </span>
                    )}
                    {row.targetType === "all" && <span className="text-[10px]">(all)</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ {row.sentCount}
                    </span>
                    {row.failedCount > 0 && (
                      <span className="text-xs text-destructive font-medium">
                        ✗ {row.failedCount}
                      </span>
                    )}
                  </div>
                </td>
                <td className="max-w-[280px] px-4 py-3">
                  <p className="truncate text-xs text-muted-foreground">{row.message}</p>
                </td>
              </tr>
              {expanded === row.id && (
                <tr className="border-t border-border/30">
                  <td colSpan={5} className="bg-muted/10 px-4 py-3">
                    <div className="space-y-2">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        Full message
                      </p>
                      <TelegramPreview text={row.message} />
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function BroadcastClient({
  accounts,
  history: initialHistory,
}: {
  accounts: ConnectedAccount[];
  history: BroadcastHistoryRow[];
}) {
  const [message, setMessage] = React.useState("");
  const [targetType, setTargetType] = React.useState<BroadcastTargetType>("all");
  const [selectedRoles, setSelectedRoles] = React.useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = React.useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [result, setResult] = React.useState<{ sent: number; failed: number } | null>(null);
  const [history, setHistory] = React.useState(initialHistory);

  const recipientCount = React.useMemo(() => {
    if (targetType === "all") return accounts.length;
    if (targetType === "roles") {
      const set = new Set(selectedRoles);
      return accounts.filter((a) => set.has(a.role)).length;
    }
    return selectedUserIds.length;
  }, [targetType, selectedRoles, selectedUserIds, accounts]);

  const canSend =
    message.trim().length > 0 &&
    message.length <= MAX_LEN &&
    recipientCount > 0 &&
    (targetType !== "roles" || selectedRoles.length > 0) &&
    (targetType !== "users" || selectedUserIds.length > 0);

  async function handleConfirm() {
    setSending(true);
    const res = await sendBroadcast({ message, targetType, targetRoles: selectedRoles, targetUserIds: selectedUserIds });
    setSending(false);
    setConfirmOpen(false);

    if (!res.ok) {
      setResult(null);
      // Show error somehow — for now re-open could be added, but toast is simpler
      alert(res.error);
      return;
    }
    setResult({ sent: res.data.sent, failed: res.data.failed });
    setMessage("");
    setSelectedRoles([]);
    setSelectedUserIds([]);
    setTargetType("all");

    // Reload history
    const { getBroadcastHistory } = await import("./actions");
    const newHistory = await getBroadcastHistory();
    setHistory(newHistory);
  }

  return (
    <div className="space-y-8">
      {/* Result banner */}
      {result && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-4">
          <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              Broadcast sent!
            </p>
            <p className="text-xs text-muted-foreground">
              Delivered to <strong>{result.sent}</strong> account{result.sent !== 1 ? "s" : ""}
              {result.failed > 0 && <> · <span className="text-destructive">{result.failed} failed</span></>}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setResult(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Composer + Recipients grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left: Composer */}
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">Message</h2>
            <p className="text-xs text-muted-foreground">
              Write your message below. HTML formatting is supported.
            </p>
          </div>
          <Composer value={message} onChange={setMessage} />
        </div>

        {/* Right: Recipients */}
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">Recipients</h2>
            <p className="text-xs text-muted-foreground">
              {accounts.length} account{accounts.length !== 1 ? "s" : ""} connected to Telegram.
            </p>
          </div>

          {accounts.length === 0 ? (
            <div className="rounded-xl border border-border/60 p-6 text-center text-sm text-muted-foreground">
              No connected accounts yet.
            </div>
          ) : (
            <RecipientPanel
              accounts={accounts}
              targetType={targetType}
              setTargetType={setTargetType}
              selectedRoles={selectedRoles}
              setSelectedRoles={setSelectedRoles}
              selectedUserIds={selectedUserIds}
              setSelectedUserIds={setSelectedUserIds}
            />
          )}

          {/* Send action */}
          <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Users className="size-4 text-muted-foreground" />
              <span>
                Will send to{" "}
                <strong
                  className={cn(
                    "tabular-nums",
                    recipientCount === 0 ? "text-muted-foreground" : "text-foreground"
                  )}
                >
                  {recipientCount}
                </strong>{" "}
                account{recipientCount !== 1 ? "s" : ""}
              </span>
            </div>
            <Button
              className="w-full"
              disabled={!canSend}
              onClick={() => setConfirmOpen(true)}
            >
              <Send className="size-4" />
              Send broadcast
            </Button>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Broadcast history</h2>
          <span className="text-xs text-muted-foreground">{history.length} total</span>
        </div>
        <HistoryTable rows={history} />
      </div>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send broadcast?</DialogTitle>
            <DialogDescription>
              This will send a Telegram message to{" "}
              <strong>{recipientCount} account{recipientCount !== 1 ? "s" : ""}</strong>.
              {targetType === "roles" && selectedRoles.length > 0 && (
                <> Targeting: {selectedRoles.map((r) => ROLES.find((x) => x.value === r)?.label ?? r).join(", ")}.</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground mb-2">Message preview:</p>
            <TelegramPreview text={message} />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={sending}>
              {sending ? (
                <><Loader2 className="size-4 animate-spin" /> Sending…</>
              ) : (
                <><Send className="size-4" /> Send to {recipientCount}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
