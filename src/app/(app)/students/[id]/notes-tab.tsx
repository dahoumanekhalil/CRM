import { FileText } from "lucide-react";
import { EmptyState } from "@/components/primitives/empty-state";
import type { StudentDetail } from "../actions";

export function NotesTab({ student }: { student: StudentDetail }) {
  if (!student.notes) {
    return (
      <EmptyState
        icon={FileText}
        title="No notes yet"
        description="Notes are private to your team. Edit the student to add some."
      />
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card p-6">
      <h2 className="mb-3 text-sm font-semibold tracking-tight">Team notes</h2>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
        {student.notes}
      </p>
    </div>
  );
}
