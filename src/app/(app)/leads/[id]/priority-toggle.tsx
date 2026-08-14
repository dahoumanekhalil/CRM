"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleLeadPriority } from "../actions";

export function PriorityToggle({
  leadId,
  isHighPriority,
}: {
  leadId: string;
  isHighPriority: boolean;
}) {
  const [pending, startTransition] = React.useTransition();
  const [optimistic, setOptimistic] = React.useState(isHighPriority);

  function handleToggle() {
    const next = !optimistic;
    setOptimistic(next);
    startTransition(async () => {
      const res = await toggleLeadPriority(leadId);
      if (!res.ok) {
        setOptimistic(!next);
        toast.error(res.error);
      } else {
        toast.success(next ? "Marked as high priority" : "Priority cleared");
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "size-9 shrink-0",
        optimistic
          ? "text-amber-500 hover:text-amber-600"
          : "text-muted-foreground hover:text-amber-500"
      )}
      title={optimistic ? "High priority — click to clear" : "Mark as high priority"}
      onClick={handleToggle}
      disabled={pending}
    >
      <Star className={cn("size-4", optimistic && "fill-amber-400")} />
      <span className="sr-only">{optimistic ? "Clear priority" : "Mark high priority"}</span>
    </Button>
  );
}
