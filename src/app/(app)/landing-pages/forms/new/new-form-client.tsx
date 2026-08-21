"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createAndRedirect } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {pending ? "Creating…" : "Create & add fields"}
    </Button>
  );
}

export function NewFormClient() {
  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-xl border border-border/70 bg-background p-6 shadow-sm">
        <form action={createAndRedirect} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="name">Form name</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g. Course registration, Contact us"
              required
              maxLength={120}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Brief internal note about this form's purpose"
              rows={2}
              maxLength={400}
            />
          </div>
          <SubmitButton />
        </form>
      </div>
    </div>
  );
}
