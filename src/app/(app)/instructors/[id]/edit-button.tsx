"use client";

import * as React from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstructorSheet } from "../instructor-sheet";
import type { InstructorRow } from "../actions";

export function EditInstructorButton({ instructor }: { instructor: InstructorRow }) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-3.5" />
        Edit
      </Button>
      <InstructorSheet
        mode="edit"
        open={open}
        onOpenChange={setOpen}
        instructor={instructor}
      />
    </>
  );
}
