"use client";

import * as React from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import {
  Activity,
  ClipboardList,
  FileText,
  Info,
  MessagesSquare,
  Wallet,
} from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { StudentDetail } from "../actions";

const TAB_VALUES = [
  "overview",
  "registrations",
  "payments",
  "communications",
  "notes",
  "activity",
] as const;
type TabValue = (typeof TAB_VALUES)[number];

const tabParam = parseAsStringLiteral(TAB_VALUES)
  .withDefault("overview")
  .withOptions({ clearOnDefault: true });

export function StudentTabsView({
  student,
  overviewSlot,
  registrationsSlot,
  paymentsSlot,
  communicationsSlot,
  notesSlot,
  activitySlot,
}: {
  student: StudentDetail;
  overviewSlot: React.ReactNode;
  registrationsSlot: React.ReactNode;
  paymentsSlot: React.ReactNode;
  communicationsSlot: React.ReactNode;
  notesSlot: React.ReactNode;
  activitySlot: React.ReactNode;
}) {
  const [tab, setTab] = useQueryState("tab", tabParam);

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => void setTab(v as TabValue, { scroll: false })}
      className="gap-6"
    >
      <div className="overflow-x-auto border-b border-border/60">
      <TabsList
        variant="line"
        className="w-max min-w-full justify-start"
      >
        <TabsTrigger value="overview">
          <Info /> Overview
        </TabsTrigger>
        <TabsTrigger value="registrations">
          <ClipboardList />
          Registrations
          <CountPill n={student._count.registrations} />
        </TabsTrigger>
        <TabsTrigger value="payments">
          <Wallet />
          Payments
          <CountPill n={student._count.payments} />
        </TabsTrigger>
        <TabsTrigger value="communications">
          <MessagesSquare /> Communications
        </TabsTrigger>
        <TabsTrigger value="notes">
          <FileText /> Notes
        </TabsTrigger>
        <TabsTrigger value="activity">
          <Activity /> Activity
        </TabsTrigger>
      </TabsList>
      </div>

      <TabsContent value="overview">{overviewSlot}</TabsContent>
      <TabsContent value="registrations">{registrationsSlot}</TabsContent>
      <TabsContent value="payments">{paymentsSlot}</TabsContent>
      <TabsContent value="communications">{communicationsSlot}</TabsContent>
      <TabsContent value="notes">{notesSlot}</TabsContent>
      <TabsContent value="activity">{activitySlot}</TabsContent>
    </Tabs>
  );
}

function CountPill({ n }: { n: number }) {
  if (n === 0) return null;
  return (
    <span className="ms-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-medium text-muted-foreground">
      {n}
    </span>
  );
}
