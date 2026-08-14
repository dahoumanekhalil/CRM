import { z } from "zod";

// Mirror Prisma's AttendanceStatus enum.
export const ATTENDANCE_STATUSES = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "EXCUSED",
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

// One entry per registered student for a given day.
const attendanceEntrySchema = z.object({
  registrationId: z.string().min(1),
  status: z.enum(ATTENDANCE_STATUSES),
  notes: z.string().trim().max(500).default(""),
});

// Payload for saving a full day's roster.
export const recordAttendanceSchema = z.object({
  sessionId: z.string().min(1),
  // ISO date "yyyy-MM-dd" — coerced to Date server-side. Kept as string so
  // <input type="date"> and JSON serialization both work cleanly.
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  entries: z.array(attendanceEntrySchema).max(1000),
});
export type RecordAttendanceInput = z.infer<typeof recordAttendanceSchema>;

export const listAttendanceSchema = z.object({
  courseId: z.string().min(1).optional(),
  // "TODAY" | "UPCOMING" | "IN_PROGRESS" | "PAST" | "ALL"
  when: z
    .enum(["ALL", "TODAY", "UPCOMING", "IN_PROGRESS", "PAST"])
    .default("ALL"),
  q: z.string().trim().max(120).optional(),
});
export type ListAttendanceInput = z.infer<typeof listAttendanceSchema>;
