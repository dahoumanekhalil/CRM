"use client";

import * as React from "react";
import { parseAsString, useQueryState } from "nuqs";
import { CoursesToolbar } from "./courses-toolbar";
import { CoursesTable } from "./courses-table";
import { NewCourseSheet } from "./new-course-sheet";
import type { CourseRow } from "./actions";

const newParam = parseAsString.withOptions({ clearOnDefault: true }).withDefault("");

export function CoursesClient({
  rows,
  total,
}: {
  rows: CourseRow[];
  total: number;
}) {
  const [rawNew, setRawNew] = useQueryState("new", newParam);
  const sheetOpen = rawNew === "1";
  const setSheetOpen = (open: boolean) => {
    void setRawNew(open ? "1" : "", { scroll: false });
  };

  return (
    <>
      <CoursesToolbar total={total} onNewCourse={() => setSheetOpen(true)} />
      <CoursesTable
        rows={rows}
        total={total}
        onNewCourse={() => setSheetOpen(true)}
      />
      <NewCourseSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}
