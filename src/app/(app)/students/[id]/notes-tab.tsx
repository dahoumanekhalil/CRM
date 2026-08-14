"use client";

import { RichNotesEditor } from "@/components/shared/rich-notes-editor";
import { updateStudentNotes } from "../actions";
import type { StudentDetail } from "../actions";

export function NotesTab({ student }: { student: StudentDetail }) {
  async function handleSave(html: string) {
    const res = await updateStudentNotes(student.id, html);
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
        initialContent={student.notes}
        onSave={handleSave}
        placeholder="Write notes about this student — attendance patterns, special requirements, anything relevant…"
      />
    </div>
  );
}
