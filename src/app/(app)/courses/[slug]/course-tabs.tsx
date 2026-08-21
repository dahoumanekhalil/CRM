"use client";

import * as React from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Globe,
  GraduationCap,
  Info,
} from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { CourseDetail } from "../actions";
import { OverviewTab } from "./overview-tab";

const TAB_VALUES = [
  "overview",
  "sessions",
  "students",
  "landing",
  "analytics",
  "activity",
] as const;
type TabValue = (typeof TAB_VALUES)[number];

const tabParam = parseAsStringLiteral(TAB_VALUES)
  .withDefault("sessions")
  .withOptions({ clearOnDefault: true });

export function CourseTabsView({
  detail,
  landingPagesSlot,
  sessionsSlot,
  studentsSlot,
  activitySlot,
}: {
  detail: CourseDetail;
  landingPagesSlot: React.ReactNode;
  sessionsSlot: React.ReactNode;
  studentsSlot: React.ReactNode;
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
        <TabsList variant="line" className="w-max min-w-full justify-start">
          <TabsTrigger value="overview">
            <Info /> Overview
          </TabsTrigger>
          <TabsTrigger value="sessions">
            <CalendarDays />
            Course Runs
            <CountPill n={detail.course._count.sessions} />
          </TabsTrigger>
          <TabsTrigger value="students">
            <GraduationCap />
            Students
            <CountPill n={detail.registrations} />
          </TabsTrigger>
          <TabsTrigger value="landing">
            <Globe />
            Landing pages
            <CountPill n={detail.course._count.landingPages} />
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 /> Analytics
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity /> Activity
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview">
        <OverviewTab detail={detail} />
      </TabsContent>

      <TabsContent value="sessions">{sessionsSlot}</TabsContent>

      <TabsContent value="students">{studentsSlot}</TabsContent>

      <TabsContent value="landing">{landingPagesSlot}</TabsContent>

      <TabsContent value="analytics">
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 bg-muted/10 py-20 text-center">
          <BarChart3 className="size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">Analytics coming soon</p>
          <p className="text-xs text-muted-foreground/70">
            Registration trends, revenue per run, and conversion rates — available in a future update.
          </p>
        </div>
      </TabsContent>

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
