"use client";

import { useState, useEffect, useTransition } from "react";
import { format } from "date-fns";
import {
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Users2,
  DollarSign,
  Loader2,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TeamCommissionRow, AgentCommissionDetail } from "./actions";
import {
  getAgentCommissionDetail,
  manuallyAdjustCommission,
  voidCommission,
} from "./actions";

function fmt(n: number) {
  return n.toLocaleString("fr-DZ") + " DZD";
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "text-amber-600" },
  EARNED: { label: "Earned", color: "text-green-600" },
  ADJUSTED: { label: "Adjusted", color: "text-blue-600" },
  PAID: { label: "Paid", color: "text-muted-foreground" },
  NO_COMMISSION: { label: "N/A", color: "text-muted-foreground" },
  VOID: { label: "Void", color: "text-red-600" },
};

interface AdjustDialogProps {
  commissionId: string;
  onClose: () => void;
  onDone: () => void;
}

function AdjustDialog({ commissionId, onClose, onDone }: AdjustDialogProps) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const parsed = parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed === 0) {
      toast.error("Enter a valid non-zero adjustment amount.");
      return;
    }
    if (reason.trim().length < 3) {
      toast.error("Reason is required (min 3 characters).");
      return;
    }
    startTransition(async () => {
      const res = await manuallyAdjustCommission({
        commissionId,
        adjustmentAmount: parsed,
        reason: reason.trim(),
      });
      if (res.ok) {
        toast.success("Commission adjusted.");
        onDone();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manual Adjustment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Adjustment amount (DZD)</Label>
            <Input
              type="number"
              placeholder="e.g. -500 or 1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Positive = add, negative = deduct.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea
              placeholder="Explain the adjustment..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
            Save adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AgentDetailPanelProps {
  agentId: string;
  onClose: () => void;
}

function AgentDetailPanel({ agentId, onClose }: AgentDetailPanelProps) {
  const [detail, setDetail] = useState<AgentCommissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [voidPending, startVoid] = useTransition();

  useEffect(() => {
    getAgentCommissionDetail(agentId).then((d) => {
      setDetail(d);
      setLoading(false);
    });
  }, [agentId]);

  function handleVoid(commissionId: string) {
    const reason = window.prompt("Reason for voiding this commission?");
    if (!reason || reason.trim().length < 3) return;
    startVoid(async () => {
      const res = await voidCommission(commissionId, reason.trim());
      if (res.ok) {
        toast.success("Commission voided.");
        const updated = await getAgentCommissionDetail(agentId);
        setDetail(updated);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {detail ? detail.agentName : "Commission detail"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !detail ? (
          <p className="text-center text-muted-foreground py-8">Not found.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-xs text-muted-foreground">Outstanding balance</p>
                <p className="text-lg font-semibold tabular-nums">
                  {fmt(detail.outstandingBalance)}
                </p>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-end">Amount</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.commissions.map((c) => {
                  const cfg = STATUS_CONFIG[c.status] ?? { label: c.status, color: "" };
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm">{c.studentName}</TableCell>
                      <TableCell className="text-sm">{c.courseName}</TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-end tabular-nums text-sm">
                        {fmt(c.finalAmount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => setAdjustingId(c.id)}
                            disabled={c.status === "PAID" || c.status === "VOID"}
                          >
                            Adjust
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-destructive"
                            onClick={() => handleVoid(c.id)}
                            disabled={
                              c.status === "PAID" ||
                              c.status === "VOID" ||
                              voidPending
                            }
                          >
                            Void
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>

      {adjustingId && (
        <AdjustDialog
          commissionId={adjustingId}
          onClose={() => setAdjustingId(null)}
          onDone={async () => {
            setAdjustingId(null);
            const updated = await getAgentCommissionDetail(agentId);
            setDetail(updated);
          }}
        />
      )}
    </Dialog>
  );
}

interface Props {
  rows: TeamCommissionRow[];
}

export function ManageCommissionsClient({ rows }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const totalOutstanding = rows.reduce((s, r) => s + r.outstandingBalance, 0);
  const totalEarned = rows.reduce((s, r) => s + r.totalEarned, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users2 className="h-4 w-4" />
              Active agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {fmt(totalEarned)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {fmt(totalOutstanding)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-center">Earned</TableHead>
              <TableHead className="text-center">Pending</TableHead>
              <TableHead className="text-center">Paid</TableHead>
              <TableHead className="text-end">Outstanding</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-12"
                >
                  No commission data yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow
                  key={r.agentId}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => setSelected(r.agentId)}
                >
                  <TableCell>
                    <p className="font-medium">{r.agentName}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {r.agentRole}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {r.earnedCount}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {r.pendingCount > 0 ? (
                      <span className="text-amber-600 font-medium">
                        {r.pendingCount}
                      </span>
                    ) : (
                      r.pendingCount
                    )}
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-muted-foreground">
                    {r.paidCount}
                  </TableCell>
                  <TableCell className="text-end tabular-nums font-semibold">
                    {r.outstandingBalance > 0 ? (
                      <span className="text-green-600">
                        {fmt(r.outstandingBalance)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selected && (
        <AgentDetailPanel
          agentId={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
