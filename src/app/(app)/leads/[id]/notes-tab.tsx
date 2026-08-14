import { FileText } from "lucide-react";
import { EmptyState } from "@/components/primitives/empty-state";
import type { LeadDetail } from "../actions";

export function NotesTab({ lead }: { lead: LeadDetail }) {
  if (!lead.notes) {
    return (
      <EmptyState
        icon={FileText}
        title="No notes yet"
        description="Edit the lead to jot down anything the team should know."
      />
    );
  }
  return (
    <div className="rounded-xl border border-border/60 bg-card p-6">
      <h2 className="mb-3 text-sm font-semibold tracking-tight">Team notes</h2>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
        {lead.notes}
      </p>
    </div>
  );
}
