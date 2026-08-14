"use client";

import { RichNotesEditor } from "@/components/shared/rich-notes-editor";
import { updateLeadNotes } from "../actions";
import type { LeadDetail } from "../actions";

export function NotesTab({ lead }: { lead: LeadDetail }) {
  async function handleSave(html: string) {
    const res = await updateLeadNotes(lead.id, html);
    if (!res.ok) throw new Error(res.error);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">Team notes</h2>
        <p className="text-xs text-muted-foreground">
          Autosaves as you type · Private to your team
        </p>
      </div>
      <RichNotesEditor
        initialContent={lead.notes}
        onSave={handleSave}
        placeholder="Write notes about this lead — call summaries, context, anything the team should know…"
      />
    </div>
  );
}
