"use client";

import * as React from "react";
import { Bot, Copy, Check, Link2, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/primitives/status-badge";
import { EmptyState } from "@/components/primitives/empty-state";
import type { EmployeeTelegramRow, GenerateTokenResult } from "../actions";
import { generateLinkTokenAsManager } from "../actions";

const STATUS_TONE = {
  CONNECTED: "success",
  PENDING: "warning",
  DISABLED: "neutral",
  REVOKED: "neutral",
  BLOCKED: "danger",
  ERROR: "danger",
} as const;

export function ManagerTelegramClient({
  initialData,
}: {
  initialData: EmployeeTelegramRow[];
}) {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");

  const [generateTarget, setGenerateTarget] =
    React.useState<EmployeeTelegramRow | null>(null);
  const [generatedToken, setGeneratedToken] =
    React.useState<GenerateTokenResult | null>(null);
  const [generating, setGenerating] = React.useState(false);
  const [copied, setCopied] = React.useState<"token" | "link" | null>(null);

  const filtered = initialData.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      r.userName?.toLowerCase().includes(q) ||
      r.userEmail.toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "NOT_CONNECTED"
        ? r.status === null
        : r.status === statusFilter);
    return matchesSearch && matchesStatus;
  });

  async function handleGenerate(row: EmployeeTelegramRow) {
    setGenerateTarget(row);
    setGeneratedToken(null);
    setGenerating(true);
    const result = await generateLinkTokenAsManager(row.userId);
    setGenerating(false);
    if (!result.ok) {
      toast.error(result.error);
      setGenerateTarget(null);
      return;
    }
    setGeneratedToken(result.data);
  }

  function closeDialog() {
    setGenerateTarget(null);
    setGeneratedToken(null);
    setCopied(null);
  }

  function copyText(text: string, type: "token" | "link") {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          aria-label="Search team members by name or email"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-64 text-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger aria-label="Filter by Telegram status" className="h-8 w-44 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="CONNECTED">Connected</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="DISABLED">Disabled</SelectItem>
            <SelectItem value="REVOKED">Revoked</SelectItem>
            <SelectItem value="NOT_CONNECTED">Not connected</SelectItem>
          </SelectContent>
        </Select>
        <span className="ms-auto text-xs text-muted-foreground">
          {filtered.length} team member{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border/70 bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/70 bg-muted/40">
              {["Employee", "Role", "Telegram Status", "Username", "Connected", "Actions"].map(
                (h) => (
                  <th
                    key={h}
                    scope="col"
                    className="h-11 px-4 text-start text-xs font-medium uppercase tracking-wider text-muted-foreground first:ps-4"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-0">
                  <EmptyState
                    icon={Bot}
                    title="No team members found"
                    description="Try adjusting your search or filter."
                    className="rounded-none border-none"
                  />
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.userId}
                  className="border-b border-border/60 last:border-0 transition-colors hover:bg-muted/20"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground/90">
                      {row.userName ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.userEmail}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs capitalize text-muted-foreground">
                      {row.userRole.toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {row.status ? (
                      <StatusBadge
                        status={row.status}
                        tone={
                          STATUS_TONE[row.status as keyof typeof STATUS_TONE]
                        }
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground/50">
                        Not connected
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {row.username ? `@${row.username}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {row.connectedAt
                      ? format(parseISO(row.connectedAt), "MMM d, yyyy")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => handleGenerate(row)}
                    >
                      <Link2 className="me-1.5 size-3" />
                      {row.status === "CONNECTED" ? "New Link" : "Generate Link"}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Generate Link Dialog */}
      <Dialog open={generateTarget !== null} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Telegram</DialogTitle>
            <DialogDescription>
              {generateTarget
                ? `Generate a secure link for ${generateTarget.userName ?? generateTarget.userEmail}.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {generating ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : generatedToken ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-border/70 bg-muted/30 px-6 py-5 text-center">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  One-time token
                </p>
                <p className="font-mono text-3xl font-bold tracking-[0.25em] text-foreground">
                  {generatedToken.token}
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Expires in 15 minutes · single use
                </p>
              </div>
              <div className="grid gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => copyText(generatedToken.token, "token")}
                >
                  {copied === "token" ? (
                    <Check className="size-4 text-success" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  Copy token
                </Button>
                {generatedToken.botUrl && (
                  <Button
                    className="gap-2"
                    onClick={() => copyText(generatedToken.botUrl, "link")}
                  >
                    {copied === "link" ? (
                      <Check className="size-4" />
                    ) : (
                      <Link2 className="size-4" />
                    )}
                    Copy Telegram link
                  </Button>
                )}
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Share this link with the team member. When they open it in
                Telegram, the bot connects their account automatically. The
                token is single-use and expires in 15 minutes.
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
