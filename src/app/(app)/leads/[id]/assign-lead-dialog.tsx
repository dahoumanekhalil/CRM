"use client";

import * as React from "react";
import { useTransition } from "react";
import { UserCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { updateLeadOwner } from "../actions";
import type { SalesTeamMember } from "../actions";

export function AssignLeadDialog({
  leadId,
  currentOwnerId,
  salesTeam,
  trigger,
}: {
  leadId: string;
  currentOwnerId: string | null;
  salesTeam: SalesTeamMember[];
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [assigneeId, setAssigneeId] = React.useState(currentOwnerId ?? "");
  const [note, setNote] = React.useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  React.useEffect(() => {
    if (open) {
      setAssigneeId(currentOwnerId ?? "");
      setNote("");
    }
  }, [open, currentOwnerId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateLeadOwner(leadId, assigneeId || null, note.trim() || undefined);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Lead assigned");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <UserCheck className="size-3.5" /> Assign
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign lead</DialogTitle>
          <DialogDescription>
            Assign this lead to a sales rep or manager. The assignment is logged
            for audit purposes.
          </DialogDescription>
        </DialogHeader>
        <form id="assign-lead-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="assignee-select">Assign to</Label>
            <Select
              value={assigneeId}
              onValueChange={setAssigneeId}
            >
              <SelectTrigger id="assignee-select" className="w-full">
                <SelectValue placeholder="Select a rep" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">
                  <span className="text-muted-foreground">Unassigned</span>
                </SelectItem>
                {salesTeam.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name ?? u.email}
                    {u.name ? (
                      <span className="ms-1.5 text-xs text-muted-foreground">
                        {u.email}
                      </span>
                    ) : null}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="assign-note">Note (optional)</Label>
            <Textarea
              id="assign-note"
              placeholder="E.g. assigned due to regional expertise"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </form>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="assign-lead-form"
            disabled={pending}
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
