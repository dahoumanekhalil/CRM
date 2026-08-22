"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  BadgeDollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type {
  MyCommissionRow,
  MyCommissionSummary,
  MyLedgerRow,
} from "./actions";

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PENDING: { label: "Pending", variant: "outline" },
  EARNED: { label: "Earned", variant: "default" },
  ADJUSTED: { label: "Adjusted", variant: "secondary" },
  PAID: { label: "Paid", variant: "secondary" },
  NO_COMMISSION: { label: "No Commission", variant: "outline" },
  VOID: { label: "Voided", variant: "destructive" },
};

const LEDGER_TYPE_LABELS: Record<string, string> = {
  EARNED: "Commission earned",
  REFUND_ADJUSTMENT: "Refund adjustment",
  MANUAL_ADJUSTMENT: "Manual adjustment",
  PAYOUT: "Payout",
  REVERSAL: "Reversal",
  VOID: "Voided",
};

function fmt(n: number) {
  return n.toLocaleString("fr-DZ") + " DZD";
}

function ScenarioHint({ scenario }: { scenario: number | null }) {
  if (!scenario) return null;
  const hints: Record<number, string> = {
    1: "No payment",
    2: "Not attended",
    3: "Full payment + attended",
    4: "Office referral + attended",
    5: "Refund applied",
  };
  return (
    <span className="text-xs text-muted-foreground">
      {hints[scenario] ?? `Scenario ${scenario}`}
    </span>
  );
}

interface Props {
  summary: MyCommissionSummary;
  commissions: MyCommissionRow[];
  ledger: MyLedgerRow[];
}

export function MyCommissionsClient({ summary, commissions, ledger }: Props) {
  const [filter, setFilter] = useState<string>("ALL");

  const filtered = useMemo(() => {
    if (filter === "ALL") return commissions;
    return commissions.filter((c) => c.status === filter);
  }, [commissions, filter]);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BadgeDollarSign className="h-4 w-4" />
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {fmt(summary.outstandingBalance)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Balance due to you
            </p>
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
              {fmt(summary.totalEarned)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Total paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {fmt(summary.totalPaid)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.paidCount} payouts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {summary.pendingCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting evaluation
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="commissions">
        <TabsList>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="commissions" className="space-y-4 mt-4">
          {/* Status filter */}
          <div className="flex flex-wrap gap-2">
            {["ALL", "PENDING", "EARNED", "ADJUSTED", "PAID"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filter === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {s === "ALL" ? "All" : STATUS_CONFIG[s]?.label ?? s}
              </button>
            ))}
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-end">Amount</TableHead>
                  <TableHead>Earned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground py-12"
                    >
                      No commissions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => {
                    const cfg = STATUS_CONFIG[c.status] ?? {
                      label: c.status,
                      variant: "outline" as const,
                    };
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <p className="font-medium">{c.studentName}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{c.courseName}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.sessionTitle}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant={cfg.variant}>{cfg.label}</Badge>
                            <ScenarioHint scenario={c.scenario} />
                          </div>
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          <p className="font-medium">{fmt(c.finalAmount)}</p>
                          {c.adjustedAmount !== 0 && (
                            <p className="text-xs text-muted-foreground">
                              adj: {c.adjustedAmount > 0 ? "+" : ""}
                              {fmt(c.adjustedAmount)}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {c.earnedAt ? (
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(c.earnedAt), "MMM d, yyyy")}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="ledger" className="mt-4">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-end">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground py-12"
                    >
                      No ledger entries yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  ledger.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(e.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {LEDGER_TYPE_LABELS[e.type] ?? e.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{e.description}</TableCell>
                      <TableCell
                        className={`text-end tabular-nums font-medium ${
                          e.amount >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {e.amount >= 0 ? "+" : ""}
                        {fmt(e.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
