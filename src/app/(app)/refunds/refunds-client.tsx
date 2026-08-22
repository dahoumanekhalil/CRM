"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  RotateCcw,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RefundApprovalRow } from "./actions";
import { approveRefund, rejectRefund } from "./actions";

function fmt(n: number) {
  return n.toLocaleString("fr-DZ") + " DZD";
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "Pending", variant: "outline" },
  APPROVED: { label: "Approved", variant: "secondary" },
  REJECTED: { label: "Rejected", variant: "destructive" },
};

interface RejectDialogProps {
  approvalId: string;
  onClose: () => void;
}

function RejectDialog({ approvalId, onClose }: RejectDialogProps) {
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const res = await rejectRefund(approvalId, reason.trim());
      if (res.ok) {
        toast.success("Refund request rejected.");
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
          <DialogTitle>Reject refund request</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Optionally provide a reason that will be sent to the requester.
          </p>
          <div className="space-y-1.5">
            <Label>Rejection reason (optional)</Label>
            <Textarea
              rows={3}
              placeholder="e.g. Insufficient documentation provided."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={submit} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface Props {
  rows: RefundApprovalRow[];
}

export function RefundsClient({ rows }: Props) {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [approvePending, startApprove] = useTransition();

  const pending = rows.filter((r) => r.status === "PENDING");
  const processed = rows.filter((r) => r.status !== "PENDING");

  function handleApprove(id: string) {
    startApprove(async () => {
      const res = await approveRefund(id);
      if (res.ok) toast.success("Refund approved and payment reversed.");
      else toast.error(res.error);
    });
  }

  function RefundTable({ items }: { items: RefundApprovalRow[] }) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Course</TableHead>
              <TableHead className="text-end">Amount</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Requested by</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-muted-foreground py-12"
                >
                  <div className="flex flex-col items-center gap-3">
                    <RotateCcw className="h-8 w-8 text-muted-foreground" />
                    <p>No refund requests here.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((r) => {
                const cfg = STATUS_CONFIG[r.status] ?? {
                  label: r.status,
                  variant: "outline" as const,
                };
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-sm">
                      {r.studentName}
                    </TableCell>
                    <TableCell className="text-sm">
                      <p>{r.courseName}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.sessionTitle !== r.courseName ? r.sessionTitle : ""}
                      </p>
                    </TableCell>
                    <TableCell className="text-end tabular-nums font-medium">
                      {fmt(r.requestedAmount)}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p
                        className="text-sm text-muted-foreground truncate"
                        title={r.reason}
                      >
                        {r.reason}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.requestedByName}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(r.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      {r.status === "REJECTED" && r.rejectionReason && (
                        <p
                          className="text-xs text-muted-foreground mt-1 max-w-[150px] truncate"
                          title={r.rejectionReason}
                        >
                          {r.rejectionReason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.status === "PENDING" && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-green-600"
                            onClick={() => handleApprove(r.id)}
                            disabled={approvePending}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 me-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-destructive"
                            onClick={() => setRejectingId(r.id)}
                          >
                            <XCircle className="h-3.5 w-3.5 me-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                      {r.status === "APPROVED" && r.approvedByName && (
                        <p className="text-xs text-muted-foreground">
                          by {r.approvedByName}
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <Clock className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {pending.length} refund request{pending.length > 1 ? "s" : ""} awaiting your review.
          </p>
        </div>
      )}

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending
            {pending.length > 0 && (
              <span className="ms-1.5 rounded-full bg-amber-100 dark:bg-amber-900 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="processed">Processed ({processed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <RefundTable items={pending} />
        </TabsContent>

        <TabsContent value="processed" className="mt-4">
          <RefundTable items={processed} />
        </TabsContent>
      </Tabs>

      {rejectingId && (
        <RejectDialog
          approvalId={rejectingId}
          onClose={() => setRejectingId(null)}
        />
      )}
    </div>
  );
}
