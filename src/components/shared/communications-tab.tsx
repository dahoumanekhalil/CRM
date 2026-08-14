"use client";

import * as React from "react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Phone,
  Mail,
  MessageSquare,
  Users,
  FileText,
  MessagesSquare,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/primitives/empty-state";
import { CommunicationSheet } from "./communication-sheet";
import { deleteCommunication } from "@/app/(app)/communications/actions";
import type {
  LeadCommunicationRow,
  StudentCommunicationRow,
} from "@/app/(app)/communications/actions";
import type { CommunicationType } from "@/lib/schemas/communication";

type Row = LeadCommunicationRow | StudentCommunicationRow;

const TYPE_ICON: Record<CommunicationType, typeof Phone> = {
  CALL: Phone,
  EMAIL: Mail,
  SMS: MessageSquare,
  WHATSAPP: MessagesSquare,
  MEETING: Users,
  NOTE: FileText,
};

const TYPE_LABEL: Record<CommunicationType, string> = {
  CALL: "Call",
  EMAIL: "Email",
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
  MEETING: "Meeting",
  NOTE: "Note",
};

const TYPE_COLOR: Record<CommunicationType, string> = {
  CALL: "text-info bg-info/10",
  EMAIL: "text-primary bg-primary/10",
  SMS: "text-warning bg-warning/10",
  WHATSAPP: "text-success bg-success/10",
  MEETING: "text-brand bg-brand/10 text-primary bg-primary/10",
  NOTE: "text-muted-foreground bg-muted",
};

function CommunicationRow({ row, onDelete }: { row: Row; onDelete: () => void }) {
  const Icon = TYPE_ICON[row.type as CommunicationType] ?? FileText;
  const colorClass = TYPE_COLOR[row.type as CommunicationType] ?? "text-muted-foreground bg-muted";
  const label = TYPE_LABEL[row.type as CommunicationType] ?? row.type;
  const when = row.sentAt ?? row.createdAt;

  return (
    <div className="flex gap-3 rounded-xl border border-border/50 bg-card p-4">
      <div
        className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg ${colorClass}`}
      >
        <Icon className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium">{label}</span>
          {row.direction === "INBOUND" ? (
            <span className="inline-flex items-center gap-0.5 text-xs text-success">
              <ArrowDownLeft className="size-3" /> Inbound
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
              <ArrowUpRight className="size-3" /> Outbound
            </span>
          )}
          <span className="ms-auto text-xs text-muted-foreground" title={format(when, "PPP p")}>
            {formatDistanceToNow(when, { addSuffix: true })}
          </span>
        </div>

        {row.subject && (
          <p className="mt-0.5 text-sm font-medium text-foreground/90">
            {row.subject}
          </p>
        )}
        {row.body && (
          <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {row.body}
          </p>
        )}

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {row.sentBy?.name ?? row.sentBy?.email ?? "System"}
          </span>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex size-6 items-center justify-center rounded text-muted-foreground/50 transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label="Delete"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function CommunicationsTab({
  rows,
  leadId,
  studentId,
}: {
  rows: Row[];
  leadId?: string;
  studentId?: string;
}) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteCommunication(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Communication deleted");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {rows.length === 0
            ? "No communications logged yet."
            : `${rows.length} ${rows.length === 1 ? "communication" : "communications"}`}
        </p>
        <Button size="sm" variant="outline" onClick={() => setSheetOpen(true)}>
          <Plus className="size-3.5" /> Log
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="No communications yet"
          description="Log a call, email, note, or meeting to keep a full interaction history."
          action={
            <Button size="sm" onClick={() => setSheetOpen(true)}>
              <Plus className="size-3.5" /> Log communication
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <CommunicationRow
              key={row.id}
              row={row}
              onDelete={() => !pending && handleDelete(row.id)}
            />
          ))}
        </div>
      )}

      <CommunicationSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        leadId={leadId}
        studentId={studentId}
      />
    </div>
  );
}
