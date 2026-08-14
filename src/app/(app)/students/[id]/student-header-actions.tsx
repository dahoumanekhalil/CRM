"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageSquarePlus, MoreHorizontal, Pencil, Phone, PhoneCall, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/primitives/confirm-dialog";
import type { StudentDetail } from "../actions";
import { deleteStudent } from "../actions";
import { StudentSheet } from "../student-sheet";
import { RegisterStudentDialog } from "@/components/shared/register-student-dialog";
import { CommunicationSheet } from "@/components/shared/communication-sheet";
import { CallOutcomePrompt, savePendingCall } from "@/components/shared/call-outcome-prompt";
import type { CommunicationType } from "@/lib/schemas/communication";

interface SessionOption {
  id: string;
  title?: string | null;
  courseName: string;
  startDate: Date;
  endDate: Date;
  city?: string | null;
  seatsTaken: number;
  capacity: number;
}

export function StudentHeaderActions({
  student,
  upcomingSessions,
}: {
  student: StudentDetail;
  upcomingSessions: SessionOption[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [registerOpen, setRegisterOpen] = React.useState(false);
  const [commOpen, setCommOpen] = React.useState(false);
  const [commType, setCommType] = React.useState<CommunicationType>("CALL");
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, startDelete] = React.useTransition();

  const fullName = [student.firstName, student.lastName].filter(Boolean).join(" ") || "Student";

  function openLog(type: CommunicationType) {
    setCommType(type);
    setCommOpen(true);
  }

  function handleCallClick() {
    if (student.phone) {
      savePendingCall({
        leadId: student.id,
        leadName: fullName,
        phone: student.phone,
        startedAt: Date.now(),
      });
    }
  }

  function handleDelete() {
    startDelete(async () => {
      const res = await deleteStudent(student.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Student deleted");
      router.push("/students");
    });
  }

  const callButton = student.phone ? (
    <Button variant="outline" size="sm" asChild className="text-success hover:text-success border-success/30 hover:border-success/50 hover:bg-success/5">
      <a href={`tel:${student.phone}`} onClick={handleCallClick}>
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
        <Button size="sm" onClick={() => setRegisterOpen(true)}>
          <Plus /> Register for course
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="size-9">
              <MoreHorizontal />
              <span className="sr-only">More actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {student.phone ? (
              <DropdownMenuItem asChild>
                <a href={`tel:${student.phone}`} onClick={handleCallClick}>
                  <PhoneCall /> Call {student.phone}
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
              <Trash2 /> Delete student
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <StudentSheet
        mode="edit"
        open={editOpen}
        onOpenChange={setEditOpen}
        student={student}
      />
      <RegisterStudentDialog
        mode="student-first"
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        student={{
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
        }}
        sessions={upcomingSessions}
      />
      <CommunicationSheet
        open={commOpen}
        onOpenChange={setCommOpen}
        studentId={student.id}
        defaultType={commType}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete student?"
        description={`This will permanently delete ${fullName} and all their communications, registrations, and payment records. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        pending={deleting}
      />
      <CallOutcomePrompt />
    </>
  );
}
