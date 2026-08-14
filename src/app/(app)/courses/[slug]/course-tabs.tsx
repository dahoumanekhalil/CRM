"use client";

import * as React from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import {
  CalendarDays,
  ClipboardList,
  Globe,
  Info,
  Wallet,
} from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { CourseDetail } from "../actions";
import { OverviewTab } from "./overview-tab";

const TAB_VALUES = [
  "overview",
  "landing",
  "sessions",
  "registrations",
  "payments",
] as const;
type TabValue = (typeof TAB_VALUES)[number];

const tabParam = parseAsStringLiteral(TAB_VALUES)
  .withDefault("overview")
  .withOptions({ clearOnDefault: true });

// `landingPagesSlot` / `sessionsSlot` are passed as JSX props from the server
// page.tsx — this lets async server components render inside a client tab
// without making CourseTabsView itself async.
export function CourseTabsView({
  detail,
  landingPagesSlot,
  sessionsSlot,
  registrationsSlot,
  paymentsSlot,
}: {
  detail: CourseDetail;
  landingPagesSlot: React.ReactNode;
  sessionsSlot: React.ReactNode;
  registrationsSlot: React.ReactNode;
  paymentsSlot: React.ReactNode;
}) {
  const [tab, setTab] = useQueryState("tab", tabParam);

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => void setTab(v as TabValue, { scroll: false })}
      className="gap-6"
    >
      <TabsList variant="line" className="w-full justify-start border-b border-border/60">
        <TabsTrigger value="overview">
          <Info /> Overview
        </TabsTrigger>
        <TabsTrigger value="landing">
          <Globe />
          Landing pages
          <CountPill n={detail.course._count.landingPages} />
        </TabsTrigger>
        <TabsTrigger value="sessions">
          <CalendarDays />
          Sessions
          <CountPill n={detail.course._count.sessions} />
        </TabsTrigger>
        <TabsTrigger value="registrations">
          <ClipboardList />
          Registrations
          <CountPill n={detail.registrations} />
        </TabsTrigger>
        <TabsTrigger value="payments">
          <Wallet /> Payments
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <OverviewTab detail={detail} />
      </TabsContent>

      <TabsContent value="landing">{landingPagesSlot}</TabsContent>

      <TabsContent value="sessions">{sessionsSlot}</TabsContent>

      <TabsContent value="registrations">{registrationsSlot}</TabsContent>

      <TabsContent value="payments">{paymentsSlot}</TabsContent>
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
