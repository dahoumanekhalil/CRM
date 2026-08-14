"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CirclePause, MoreHorizontal, Pencil, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CampaignDetail } from "../actions";
import { setCampaignStatus } from "../actions";
import { CampaignSheet } from "../campaign-sheet";

export function CampaignHeaderActions({
  campaign,
}: {
  campaign: CampaignDetail;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const isActive = campaign.status === "ACTIVE";
  const canPause = isActive;
  const canResume =
    campaign.status === "PAUSED" || campaign.status === "DRAFT";

  const flip = (next: "ACTIVE" | "PAUSED" | "COMPLETED") => {
    startTransition(async () => {
      const res = await setCampaignStatus(campaign.id, next);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        next === "ACTIVE"
          ? "Campaign activated"
          : next === "PAUSED"
          ? "Campaign paused"
          : "Campaign completed"
      );
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 md:shrink-0">
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil /> Edit
        </Button>
        {canPause ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => flip("PAUSED")}
            disabled={pending}
          >
            <CirclePause /> Pause
          </Button>
        ) : canResume ? (
          <Button size="sm" onClick={() => flip("ACTIVE")} disabled={pending}>
            <Play /> Activate
          </Button>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="size-9">
              <MoreHorizontal />
              <span className="sr-only">More actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {campaign.status !== "COMPLETED" ? (
              <DropdownMenuItem onClick={() => flip("COMPLETED")}>
                Mark completed
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled
              className="text-destructive focus:text-destructive"
            >
              Delete campaign
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <CampaignSheet
        mode="edit"
        open={editOpen}
        onOpenChange={setEditOpen}
        campaign={campaign}
      />
    </>
  );
}
