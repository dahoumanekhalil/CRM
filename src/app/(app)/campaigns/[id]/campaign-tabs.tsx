"use client";

import * as React from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { Contact, Info, Target } from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const TAB_VALUES = ["overview", "leads", "attribution"] as const;
type TabValue = (typeof TAB_VALUES)[number];

const tabParam = parseAsStringLiteral(TAB_VALUES)
  .withDefault("overview")
  .withOptions({ clearOnDefault: true });

export function CampaignTabsView({
  leadsCount,
  overviewSlot,
  leadsSlot,
  attributionSlot,
}: {
  leadsCount: number;
  overviewSlot: React.ReactNode;
  leadsSlot: React.ReactNode;
  attributionSlot: React.ReactNode;
}) {
  const [tab, setTab] = useQueryState("tab", tabParam);

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => void setTab(v as TabValue, { scroll: false })}
      className="gap-6"
    >
      <TabsList
        variant="line"
        className="w-full justify-start border-b border-border/60"
      >
        <TabsTrigger value="overview">
          <Info /> Overview
        </TabsTrigger>
        <TabsTrigger value="leads">
          <Contact />
          Leads
          <CountPill n={leadsCount} />
        </TabsTrigger>
        <TabsTrigger value="attribution">
          <Target /> Attribution
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview">{overviewSlot}</TabsContent>
      <TabsContent value="leads">{leadsSlot}</TabsContent>
      <TabsContent value="attribution">{attributionSlot}</TabsContent>
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
