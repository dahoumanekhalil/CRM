"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import {
  Plus,
  CheckCircle2,
  XCircle,
  Loader2,
  BadgeDollarSign,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CommissionRuleRow } from "./actions";
import {
  createCommissionRule,
  activateCommissionRule,
  deactivateCommissionRule,
} from "./actions";

function fmt(n: number) {
  return n.toLocaleString("fr-DZ") + " DZD";
}

interface Course {
  id: string;
  name: string;
}

interface CreateRuleDialogProps {
  courses: Course[];
  onClose: () => void;
}

function CreateRuleDialog({ courses, onClose }: CreateRuleDialogProps) {
  const [name, setName] = useState("");
  const [fixedAmount, setFixedAmount] = useState("");
  const [refundRetention, setRefundRetention] = useState("0");
  const [courseId, setCourseId] = useState("__org__");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!name.trim()) { toast.error("Name is required."); return; }
    const amount = parseFloat(fixedAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid positive amount.");
      return;
    }
    const retention = parseFloat(refundRetention);
    if (!Number.isFinite(retention) || retention < 0 || retention > 100) {
      toast.error("Refund retention must be 0–100%.");
      return;
    }

    startTransition(async () => {
      const res = await createCommissionRule({
        name: name.trim(),
        fixedAmount: amount,
        currency: "DZD",
        refundRetentionPercent: retention,
        courseId: courseId === "__org__" ? undefined : courseId,
      });
      if (res.ok) {
        toast.success("Commission rule created.");
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
          <DialogTitle>New commission rule</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Rule name</Label>
            <Input
              placeholder="e.g. Standard sales commission"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Fixed commission amount (DZD)</Label>
            <Input
              type="number"
              placeholder="e.g. 5000"
              value={fixedAmount}
              onChange={(e) => setFixedAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Fixed amount per sale. Not percentage-based.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Refund retention %</Label>
            <Input
              type="number"
              placeholder="0–100"
              min={0}
              max={100}
              value={refundRetention}
              onChange={(e) => setRefundRetention(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              % of commission retained when a refund is approved. 0 = full clawback, 100 = keep all.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Scope</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__org__">All courses (org-wide default)</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Course-specific rules override the org-wide rule.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
            Create rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface Props {
  rules: CommissionRuleRow[];
  courses: Course[];
}

export function CommissionRulesClient({ rules, courses }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [activatePending, startActivate] = useTransition();
  const [deactivatePending, startDeactivate] = useTransition();

  function handleActivate(id: string) {
    startActivate(async () => {
      const res = await activateCommissionRule(id);
      if (res.ok) toast.success("Rule activated.");
      else toast.error(res.error);
    });
  }

  function handleDeactivate(id: string) {
    startDeactivate(async () => {
      const res = await deactivateCommissionRule(id);
      if (res.ok) toast.success("Rule deactivated.");
      else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Only one rule can be active per scope (org-wide or per course). Activating a rule
            automatically deactivates the previous one for that scope.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 me-2" />
          New rule
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead className="text-end">Amount</TableHead>
              <TableHead className="text-end">Refund retention</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Since</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-12"
                >
                  <div className="flex flex-col items-center gap-3">
                    <BadgeDollarSign className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">No commission rules</p>
                      <p className="text-sm text-muted-foreground">
                        Create a rule to start tracking agent commissions.
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rules.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <p className="font-medium text-sm">{r.name}</p>
                    {r.createdByName && (
                      <p className="text-xs text-muted-foreground">
                        by {r.createdByName}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.courseName ?? (
                      <span className="text-muted-foreground italic">Org-wide</span>
                    )}
                  </TableCell>
                  <TableCell className="text-end tabular-nums font-medium">
                    {fmt(r.fixedAmount)}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {r.refundRetentionPercent}%
                  </TableCell>
                  <TableCell>
                    {r.isActive ? (
                      <Badge className="text-xs">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(r.effectiveFrom), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {r.isActive ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive"
                        onClick={() => handleDeactivate(r.id)}
                        disabled={deactivatePending}
                      >
                        <XCircle className="h-3.5 w-3.5 me-1" />
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => handleActivate(r.id)}
                        disabled={activatePending}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 me-1" />
                        Activate
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {showCreate && (
        <CreateRuleDialog
          courses={courses}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
