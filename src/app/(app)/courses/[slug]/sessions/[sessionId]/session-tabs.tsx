"use client";

import * as React from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { Activity, BarChart2, Contact, Info, Radio, Users, Wallet } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const TAB_VALUES = ["overview", "students", "leads", "payments", "financials", "live", "activity"] as const;
type TabValue = (typeof TAB_VALUES)[number];

const tabParam = parseAsStringLiteral(TAB_VALUES)
  .withDefault("overview")
  .withOptions({ clearOnDefault: true });

export function SessionTabsView({
  overviewSlot,
  studentsSlot,
  leadsSlot,
  paymentsSlot,
  financialsSlot,
  liveSlot,
  activitySlot,
  enrolledCount,
  leadsCount,
  isLive,
}: {
  overviewSlot: React.ReactNode;
  studentsSlot: React.ReactNode;
  leadsSlot: React.ReactNode;
  paymentsSlot: React.ReactNode;
  financialsSlot: React.ReactNode;
  liveSlot: React.ReactNode;
  activitySlot: React.ReactNode;
  enrolledCount: number;
  leadsCount: number;
  isLive?: boolean;
}) {
  const [tab, setTab] = useQueryState("tab", tabParam);

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => void setTab(v as TabValue, { scroll: false })}
      className="gap-6"
    >
      <div className="overflow-x-auto border-b border-border/60">
        <TabsList variant="line" className="w-max min-w-full justify-start">
          <TabsTrigger value="overview">
            <Info className="size-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="students">
            <Users className="size-3.5" />
            Students
            {enrolledCount > 0 && (
              <span className="ms-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-medium text-muted-foreground">
                {enrolledCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="leads">
            <Contact className="size-3.5" />
            Leads
            {leadsCount > 0 && (
              <span className="ms-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-medium text-muted-foreground">
                {leadsCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="payments">
            <Wallet className="size-3.5" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="financials">
            <BarChart2 className="size-3.5" />
            Financials
          </TabsTrigger>
          <TabsTrigger value="live">
            <Radio className={isLive ? "size-3.5 text-red-500" : "size-3.5"} />
            Live
            {isLive && (
              <span className="ms-1 inline-flex size-1.5 rounded-full bg-red-500 animate-pulse" />
            )}
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="size-3.5" />
            Activity
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview">{overviewSlot}</TabsContent>
      <TabsContent value="students">{studentsSlot}</TabsContent>
      <TabsContent value="leads">{leadsSlot}</TabsContent>
      <TabsContent value="payments">{paymentsSlot}</TabsContent>
      <TabsContent value="financials">{financialsSlot}</TabsContent>
      <TabsContent value="live">{liveSlot}</TabsContent>
      <TabsContent value="activity">{activitySlot}</TabsContent>
    </Tabs>
  );
}
