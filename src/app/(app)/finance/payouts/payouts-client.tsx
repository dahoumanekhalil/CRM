"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import {
  DollarSign,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AgentBalanceRow, PayoutRow } from "./actions";
import {
  createPayout,
  completePayout,
  cancelPayout,
} from "./actions";

function fmt(n: number) {
  return n.toLocaleString("fr-DZ") + " DZD";
}

const PAYOUT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "BANK_CHECK", label: "Bank check" },
  { value: "POSTAL_MOBILE", label: "BaridiMob / Postal" },
  { value: "CARD", label: "Card" },
  { value: "ONLINE", label: "Online" },
  { value: "OTHER", label: "Other" },
];

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "Pending", variant: "outline" },
  PAID: { label: "Paid", variant: "secondary" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

interface CreatePayoutDialogProps {
  agents: AgentBalanceRow[];
  onClose: () => void;
}

function CreatePayoutDialog({ agents, onClose }: CreatePayoutDialogProps) {
  const [agentId, setAgentId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  const selectedAgent = agents.find((a) => a.agentId === agentId);

  function submit() {
    if (!agentId) { toast.error("Select an agent."); return; }
    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Enter a valid positive amount.");
      return;
    }
    if (!method) { toast.error("Select a payment method."); return; }

    startTransition(async () => {
      const res = await createPayout({
        agentId,
        amount: parsedAmount,
        method: method as "CASH" | "BANK_TRANSFER" | "BANK_CHECK" | "POSTAL_MOBILE" | "CARD" | "ONLINE" | "OTHER",
        reference: reference || undefined,
        notes: notes || undefined,
      });
      if (res.ok) {
        toast.success("Payout created.");
        onClose();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create payout</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Agent</Label>
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select agent…" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((a) => (
                  <SelectItem key={a.agentId} value={a.agentId}>
                    {a.agentName} — {fmt(a.outstandingBalance)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedAgent && (
              <p className="text-xs text-muted-foreground">
                Outstanding: {fmt(selectedAgent.outstandingBalance)}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Amount (DZD)</Label>
            <Input
              type="number"
              placeholder="e.g. 5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              max={selectedAgent?.outstandingBalance}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select method…" />
              </SelectTrigger>
              <SelectContent>
                {PAYOUT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Reference (optional)</Label>
            <Input
              placeholder="Transaction ref, receipt #…"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
            Create payout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface Props {
  agents: AgentBalanceRow[];
  payouts: PayoutRow[];
}

export function PayoutsClient({ agents, payouts }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [completePending, startComplete] = useTransition();
  const [cancelPending, startCancel] = useTransition();

  const totalOutstanding = agents.reduce((s, a) => s + a.outstandingBalance, 0);

  function handleComplete(id: string) {
    startComplete(async () => {
      const res = await completePayout(id);
      if (res.ok) toast.success("Payout marked as paid.");
      else toast.error(res.error);
    });
  }

  function handleCancel(id: string) {
    startCancel(async () => {
      const res = await cancelPayout(id);
      if (res.ok) toast.success("Payout cancelled.");
      else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
          <DollarSign className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Total outstanding commissions</p>
            <p className="font-semibold tabular-nums">{fmt(totalOutstanding)}</p>
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)} disabled={agents.length === 0}>
          <Plus className="h-4 w-4 me-2" />
          New payout
        </Button>
      </div>

      {/* Agent balances */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          Agent balances
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {agents.length === 0 ? (
            <p className="text-sm text-muted-foreground col-span-full py-4">
              No agents with outstanding balances.
            </p>
          ) : (
            agents.map((a) => (
              <Card key={a.agentId} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{a.agentName}</p>
                    <p className="text-xs text-muted-foreground">{a.agentEmail}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">{a.role}</Badge>
                </div>
                <div className="mt-3">
                  <p className="text-lg font-semibold tabular-nums text-green-600">
                    {fmt(a.outstandingBalance)}
                  </p>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{a.earnedCount} earned</span>
                    <span>{a.paidCount} paid</span>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Payout history */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          Payout history
        </h2>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-end">Amount</TableHead>
                <TableHead>Created</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-12"
                  >
                    No payouts recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                payouts.map((p) => {
                  const cfg = STATUS_CONFIG[p.status] ?? {
                    label: p.status,
                    variant: "outline" as const,
                  };
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-sm">
                        {p.agentName}
                      </TableCell>
                      <TableCell className="text-sm">{p.method}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.reference ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-end tabular-nums font-medium">
                        {fmt(p.amount)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(p.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        {p.status === "PENDING" && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-green-600"
                              onClick={() => handleComplete(p.id)}
                              disabled={completePending}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 me-1" />
                              Mark paid
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-destructive"
                              onClick={() => handleCancel(p.id)}
                              disabled={cancelPending}
                            >
                              <XCircle className="h-3.5 w-3.5 me-1" />
                              Cancel
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {showCreate && (
        <CreatePayoutDialog
          agents={agents.filter((a) => a.outstandingBalance > 0)}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
