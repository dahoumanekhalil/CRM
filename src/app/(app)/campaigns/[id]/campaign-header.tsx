import Link from "next/link";
import { Megaphone } from "lucide-react";
import { BackArrow } from "@/components/primitives/nav-arrow";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/primitives/status-badge";
import type { CampaignDetail } from "../actions";
import { CampaignHeaderActions } from "./campaign-header-actions";

function dateRange(start: Date | null, end: Date | null): string | null {
  if (!start && !end) return null;
  if (start && !end) return `From ${format(start, "MMM d, yyyy")}`;
  if (!start && end) return `Until ${format(end, "MMM d, yyyy")}`;
  return `${format(start!, "MMM d")} → ${format(end!, "MMM d, yyyy")}`;
}

export function CampaignHeader({ campaign }: { campaign: CampaignDetail }) {
  const schedule = dateRange(campaign.startDate, campaign.endDate);

  return (
    <header className="border-b border-border/60">
      <div className="border-b border-border/40 bg-muted/20 px-6 py-2">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-7 px-2 text-xs text-muted-foreground"
        >
          <Link href="/campaigns">
            <BackArrow className="size-3.5" /> All campaigns
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-6 px-6 py-6 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="grid size-16 shrink-0 place-items-center rounded-lg border border-border/70 bg-primary/5 text-primary">
            <Megaphone className="size-6" />
          </div>
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">
                {campaign.name}
              </h1>
              <StatusBadge status={campaign.status} />
            </div>
            {campaign.description ? (
              <p className="max-w-2xl text-sm text-muted-foreground">
                {campaign.description}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {campaign.source ? (
                <span className="inline-flex items-center rounded-md border border-border/60 bg-muted/40 px-2 py-0.5">
                  {campaign.source}
                </span>
              ) : null}
              {schedule ? <span>{schedule}</span> : null}
              {campaign.budget !== null ? (
                <>
                  <span aria-hidden className="opacity-40">
                    ·
                  </span>
                  <span className="tabular-nums">
                    Budget {new Intl.NumberFormat().format(campaign.budget)}
                  </span>
                </>
              ) : null}
              <span aria-hidden className="opacity-40">
                ·
              </span>
              <span className="tabular-nums">
                {campaign._count.leads}{" "}
                {campaign._count.leads === 1 ? "lead" : "leads"}
              </span>
            </div>
          </div>
        </div>

        <CampaignHeaderActions campaign={campaign} />
      </div>
    </header>
  );
}
