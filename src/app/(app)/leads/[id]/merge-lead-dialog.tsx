"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  getLeadDuplicatesForMerge,
  mergeLeads,
  type PotentialDuplicate,
} from "../actions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  primaryLeadId: string;
  primaryName: string;
}

export function MergeLeadDialog({ open, onOpenChange, primaryLeadId, primaryName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [saving, startSave] = React.useTransition();
  const [candidates, setCandidates] = React.useState<PotentialDuplicate[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setCandidates([]);
      setSelected(null);
      return;
    }
    setLoading(true);
    getLeadDuplicatesForMerge(primaryLeadId)
      .then(setCandidates)
      .catch(() => toast.error("Couldn't load potential duplicates."))
      .finally(() => setLoading(false));
  }, [open, primaryLeadId]);

  function handleConfirm() {
    if (!selected) return;
    startSave(async () => {
      const res = await mergeLeads(primaryLeadId, selected);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Leads merged — secondary marked as Lost");
      onOpenChange(false);
      router.push(`/leads/${primaryLeadId}`);
      router.refresh();
    });
  }

  const selectedCandidate = candidates.find((c) => c.id === selected);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Merge duplicate lead</DialogTitle>
          <DialogDescription>
            Keep <strong>{primaryName}</strong> as the primary. Choose the duplicate to
            close — its communications, notes, and history will be moved here.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : candidates.length === 0 ? (
            <div className="rounded-md border border-border/60 bg-muted/20 px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                No potential duplicates found based on email or phone.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Merging is only available when a matching lead is detected.
              </p>
            </div>
          ) : (
            candidates.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(c.id === selected ? null : c.id)}
                className={`w-full rounded-lg border px-4 py-3 text-start transition-all ${
                  selected === c.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border/60 bg-card hover:border-primary/40 hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {selected === c.id ? (
                        <CheckCircle2 className="size-4 shrink-0 text-primary" />
                      ) : null}
                      <span className="text-sm font-medium">{c.name || "Unnamed lead"}</span>
                    </div>
                    {c.email ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{c.email}</p>
                    ) : null}
                    {c.phone ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{c.phone}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    matched on {c.matchedOn}
                  </span>
                </div>
              </button>
            ))
          )}

          {selected && selectedCandidate ? (
            <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2.5 text-xs text-warning">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>
                <strong>{selectedCandidate.name || "The selected lead"}</strong> will be
                permanently marked as <strong>Lost</strong> and its data moved to{" "}
                <strong>{primaryName}</strong>. This cannot be undone.
              </span>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!selected || saving || candidates.length === 0}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Merge and close duplicate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
