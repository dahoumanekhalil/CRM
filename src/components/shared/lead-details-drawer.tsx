"use client";

import * as React from "react";
import Link from "next/link";
import { parseISO, formatDistanceToNow, isPast, isToday } from "date-fns";
import {
  BookOpen,
  ClipboardList,
  Clock,
  ExternalLink,
  Mail,
  MessageSquare,
  Phone,
  Star,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/primitives/status-badge";
import { TaskSheet } from "@/app/(app)/tasks/task-sheet";
import { CommunicationSheet } from "@/components/shared/communication-sheet";
import { listUsersForPicker } from "@/app/(app)/tasks/actions";
import type { LeadRow } from "@/app/(app)/leads/actions";
import type { UserPickerItem } from "@/app/(app)/tasks/actions";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

interface LeadDetailsDrawerProps {
  lead: LeadRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadDetailsDrawer({
  lead,
  open,
  onOpenChange,
}: LeadDetailsDrawerProps) {
  const [users, setUsers] = React.useState<UserPickerItem[]>([]);
  const [taskOpen, setTaskOpen] = React.useState(false);
  const [commOpen, setCommOpen] = React.useState(false);

  // Fetch users once a lead is selected so TaskSheet has an owner picker.
  React.useEffect(() => {
    if (!lead) return;
    listUsersForPicker().then(setUsers).catch(() => {});
  }, [lead?.id]);

  const name = lead
    ? [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unnamed lead"
    : "";

  const due = lead?.nextActionDue
    ? parseISO(lead.nextActionDue.toString())
    : null;
  const isOverdue = due && isPast(due) && !isToday(due);
  const isDueToday = due && isToday(due);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-sm"
        >
          <SheetHeader className="px-6 pb-4 pt-6">
            <div className="flex items-start gap-3">
              <div className="relative shrink-0">
                <Avatar className="size-10">
                  <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                    {initials(name || "?")}
                  </AvatarFallback>
                </Avatar>
                {lead?.isHighPriority ? (
                  <Star className="absolute -end-1 -top-1 size-3.5 fill-amber-400 text-amber-400" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <SheetTitle className="truncate text-base leading-snug">
                  {name}
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Quick view of lead {name}
                </SheetDescription>
                {lead ? (
                  <StatusBadge status={lead.status} className="mt-1.5" />
                ) : null}
              </div>
            </div>
          </SheetHeader>

          <Separator />

          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
            <MetaSection label="Contact">
              {lead?.email ? (
                <a
                  href={`mailto:${lead.email}`}
                  className="flex items-center gap-2 text-sm text-foreground hover:underline"
                >
                  <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{lead.email}</span>
                </a>
              ) : null}
              {lead?.phone ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="size-3.5 shrink-0" />
                  {lead.phone}
                </p>
              ) : null}
              {!lead?.email && !lead?.phone ? (
                <p className="text-sm text-muted-foreground">No contact info</p>
              ) : null}
            </MetaSection>

            {lead?.course ? (
              <MetaSection label="Interested in">
                <Link
                  href={`/courses/${lead.course.slug}`}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center gap-2 text-sm text-foreground hover:underline"
                >
                  <BookOpen className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{lead.course.name}</span>
                </Link>
              </MetaSection>
            ) : null}

            <MetaSection label="Owner">
              {lead?.owner ? (
                <div className="flex items-center gap-2">
                  <Avatar className="size-5">
                    <AvatarImage src={lead.owner.image ?? undefined} />
                    <AvatarFallback className="bg-muted text-[10px]">
                      {initials(lead.owner.name ?? lead.owner.email ?? "?")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm">
                    {lead.owner.name ?? lead.owner.email}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Unassigned</p>
              )}
            </MetaSection>

            {lead?.nextAction ? (
              <MetaSection label="Next action">
                <div
                  className={cn(
                    "flex items-start gap-2 text-sm",
                    isOverdue
                      ? "text-destructive"
                      : isDueToday
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-foreground"
                  )}
                >
                  <Clock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate">{lead.nextAction}</p>
                    {due ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Due {formatDistanceToNow(due, { addSuffix: true })}
                      </p>
                    ) : null}
                  </div>
                </div>
              </MetaSection>
            ) : null}

            <MetaSection label="Last contact">
              <p className="text-sm text-muted-foreground">
                {lead?.lastContactedAt
                  ? formatDistanceToNow(lead.lastContactedAt, {
                      addSuffix: true,
                    })
                  : "Never contacted"}
              </p>
            </MetaSection>

            {lead?.source ? (
              <MetaSection label="Source">
                <p className="text-sm text-muted-foreground">{lead.source}</p>
              </MetaSection>
            ) : null}
          </div>

          <Separator />

          <div className="space-y-2 px-6 py-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setTaskOpen(true)}
              >
                <ClipboardList className="size-3.5" />
                Create task
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setCommOpen(true)}
              >
                <MessageSquare className="size-3.5" />
                Log call
              </Button>
            </div>
            <Button size="sm" className="w-full" asChild>
              <Link
                href={lead ? `/leads/${lead.id}` : "#"}
                onClick={() => onOpenChange(false)}
              >
                <ExternalLink className="size-3.5" />
                Open full profile
              </Link>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {lead ? (
        <>
          <TaskSheet
            open={taskOpen}
            onOpenChange={setTaskOpen}
            users={users}
            defaultEntityType="Lead"
            defaultEntityId={lead.id}
            defaultEntityLabel={name}
          />
          <CommunicationSheet
            open={commOpen}
            onOpenChange={setCommOpen}
            leadId={lead.id}
          />
        </>
      ) : null}
    </>
  );
}

function MetaSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
        {label}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
