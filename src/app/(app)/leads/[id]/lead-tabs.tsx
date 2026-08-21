"use client";

import * as React from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { Activity, CheckSquare, FileText, Info, MessagesSquare, Target } from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { LeadDetail } from "../actions";

const TAB_VALUES = ["overview", "tasks", "communications", "notes", "attribution", "activity"] as const;
type TabValue = (typeof TAB_VALUES)[number];

const tabParam = parseAsStringLiteral(TAB_VALUES)
  .withDefault("overview")
  .withOptions({ clearOnDefault: true });

export function LeadTabsView({
  lead,
  overviewSlot,
  tasksSlot,
  communicationsSlot,
  notesSlot,
  attributionSlot,
  activitySlot,
  taskCount,
}: {
  lead: LeadDetail;
  overviewSlot: React.ReactNode;
  tasksSlot: React.ReactNode;
  communicationsSlot: React.ReactNode;
  notesSlot: React.ReactNode;
  attributionSlot: React.ReactNode;
  activitySlot: React.ReactNode;
  taskCount?: number;
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
        <TabsTrigger value="tasks">
          <CheckSquare /> Tasks
          {taskCount != null && taskCount > 0 ? (
            <span className="ms-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/10 px-1 text-[10px] font-medium text-primary">
              {taskCount}
            </span>
          ) : null}
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
      <TabsContent value="tasks">{tasksSlot}</TabsContent>
      <TabsContent value="communications">{communicationsSlot}</TabsContent>
      <TabsContent value="notes">{notesSlot}</TabsContent>
      <TabsContent value="attribution">{attributionSlot}</TabsContent>
      <TabsContent value="activity">{activitySlot}</TabsContent>
    </Tabs>
  );
}
