"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CopyPlus, Loader2, MoreHorizontal, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CourseDetail } from "../actions";
import { duplicateCourse } from "../actions";
import { EditCourseSheet } from "./edit-course-sheet";

export function CourseHeaderActions({ course }: { course: CourseDetail["course"] }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const onDuplicate = () => {
    startTransition(async () => {
      const res = await duplicateCourse(course.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Course duplicated");
      router.push(`/courses/${res.data.slug}`);
    });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setEditOpen(true)}
        disabled={pending}
      >
        <Pencil /> Edit
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="size-9" disabled={pending}>
            {pending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <MoreHorizontal />
            )}
            <span className="sr-only">More actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onDuplicate}>
            <CopyPlus /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled
            className="text-destructive focus:text-destructive"
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditCourseSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        course={course}
      />
    </>
  );
}
