"use client";

import * as React from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { Activity, FileText, Info, MessagesSquare, Target } from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { LeadDetail } from "../actions";

const TAB_VALUES = ["overview", "communications", "notes", "attribution", "activity"] as const;
type TabValue = (typeof TAB_VALUES)[number];

const tabParam = parseAsStringLiteral(TAB_VALUES)
  .withDefault("overview")
  .withOptions({ clearOnDefault: true });

export function LeadTabsView({
  lead,
  overviewSlot,
  communicationsSlot,
  notesSlot,
  attributionSlot,
  activitySlot,
}: {
  lead: LeadDetail;
  overviewSlot: React.ReactNode;
  communicationsSlot: React.ReactNode;
  notesSlot: React.ReactNode;
  attributionSlot: React.ReactNode;
  activitySlot: React.ReactNode;
}) {
  const [tab, setTab] = useQueryState("tab", tabParam);
  void lead;

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
        <TabsTrigger value="communications">
          <MessagesSquare /> Communications
        </TabsTrigger>
        <TabsTrigger value="notes">
          <FileText /> Notes
        </TabsTrigger>
        <TabsTrigger value="attribution">
          <Target /> Attribution
        </TabsTrigger>
        <TabsTrigger value="activity">
          <Activity /> Activity
        </TabsTrigger>
      </TabsList>
      </div>

      <TabsContent value="overview">{overviewSlot}</TabsContent>
      <TabsContent value="communications">{communicationsSlot}</TabsContent>
      <TabsContent value="notes">{notesSlot}</TabsContent>
      <TabsContent value="attribution">{attributionSlot}</TabsContent>
      <TabsContent value="activity">{activitySlot}</TabsContent>
    </Tabs>
  );
}
