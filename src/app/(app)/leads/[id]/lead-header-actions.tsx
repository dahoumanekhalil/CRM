"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ExternalLink,
  GraduationCap,
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  Phone,
  PhoneCall,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/primitives/confirm-dialog";
import type { LeadDetail } from "../actions";
import { deleteLead } from "../actions";
import { EditLeadSheet } from "./edit-lead-sheet";
import {
  ConvertLeadDialog,
  type SessionForConvert,
} from "@/components/shared/convert-lead-dialog";
import { CommunicationSheet } from "@/components/shared/communication-sheet";
import { CallOutcomePrompt, savePendingCall } from "@/components/shared/call-outcome-prompt";
import type { CommunicationType } from "@/lib/schemas/communication";

export function LeadHeaderActions({
  lead,
  sessionsForCourse,
}: {
  lead: LeadDetail;
  sessionsForCourse: SessionForConvert[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [convertOpen, setConvertOpen] = React.useState(false);
  const [commOpen, setCommOpen] = React.useState(false);
  const [commType, setCommType] = React.useState<CommunicationType>("CALL");
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, startDelete] = React.useTransition();

  const alreadyConverted = !!lead.studentId;
  const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Lead";

  function openLog(type: CommunicationType) {
    setCommType(type);
    setCommOpen(true);
  }

  function handleCallClick() {
    if (lead.phone) {
      savePendingCall({
        leadId: lead.id,
        leadName: fullName,
        phone: lead.phone,
        startedAt: Date.now(),
      });
    }
  }

  function handleDelete() {
    startDelete(async () => {
      const res = await deleteLead(lead.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Lead deleted");
      router.push("/leads");
    });
  }

  const callButton = lead.phone ? (
    <Button
      variant="outline"
      size="sm"
      asChild
      className="text-success hover:text-success border-success/30 hover:border-success/50 hover:bg-success/5"
    >
      <a href={`tel:${lead.phone}`} onClick={handleCallClick}>
        <PhoneCall /> Call
      </a>
    </Button>
  ) : (
    <Button
      variant="outline"
      size="sm"
      onClick={() => openLog("CALL")}
      className="text-muted-foreground"
      title="No phone number on file"
    >
      <Phone /> Log call
    </Button>
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 md:shrink-0">
        {callButton}
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil /> Edit
        </Button>
        {alreadyConverted && lead.student ? (
          <Button size="sm" asChild>
            <Link href={`/students/${lead.student.id}`}>
              <ExternalLink /> Open student
            </Link>
          </Button>
        ) : (
          <Button size="sm" onClick={() => setConvertOpen(true)}>
            <GraduationCap /> Convert to student
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="size-9">
              <MoreHorizontal />
              <span className="sr-only">More actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {lead.phone ? (
              <DropdownMenuItem asChild>
                <a href={`tel:${lead.phone}`} onClick={handleCallClick}>
                  <PhoneCall /> Call {lead.phone}
                </a>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => openLog("CALL")}>
                <Phone /> Log call
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => openLog("EMAIL")}>
              <MessageSquarePlus /> Log email
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openLog("WHATSAPP")}>
              <MessageSquarePlus /> Log WhatsApp
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openLog("MEETING")}>
              <MessageSquarePlus /> Log meeting
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openLog("NOTE")}>
              <MessageSquarePlus /> Add note
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeleteOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 /> Delete lead
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <EditLeadSheet open={editOpen} onOpenChange={setEditOpen} lead={lead} />
      {!alreadyConverted ? (
        <ConvertLeadDialog
          open={convertOpen}
          onOpenChange={setConvertOpen}
          lead={{
            id: lead.id,
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
            courseId: lead.course?.id ?? null,
            courseName: lead.course?.name ?? null,
          }}
          sessions={sessionsForCourse}
        />
      ) : null}
      <CommunicationSheet
        open={commOpen}
        onOpenChange={setCommOpen}
        leadId={lead.id}
        defaultType={commType}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete lead?"
        description={`This will permanently delete ${fullName} and all their communications. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        pending={deleting}
      />
      <CallOutcomePrompt />
    </>
  );
}
