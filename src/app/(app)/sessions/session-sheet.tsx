"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { z } from "zod";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  FormSection,
  FormSectionDivider,
} from "@/components/primitives/form-section";

import {
  createSessionSchema,
  updateSessionSchema,
  SESSION_STATUSES,
  type CreateSessionInput,
  type UpdateSessionInput,
} from "@/lib/schemas/session";
import { createSession, updateSession } from "./actions";
import type {
  CoursePickerItem,
  CourseSessionRow,
  InstructorPickerItem,
  SessionRow,
} from "./actions";

const humanize = (s: string) =>
  s
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

// Format for <input type="datetime-local"> — local time, no seconds, no TZ.
function toLocalDatetimeInput(d: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type CreateInput = z.input<typeof createSessionSchema>;
type FormInput = CreateInput & { id?: string };

interface CommonProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: CoursePickerItem[];
  instructors: InstructorPickerItem[];
  // If provided, the course selector is hidden and locked to this course.
  lockedCourseId?: string;
}

type EditableSession = SessionRow | CourseSessionRow;

interface CreateProps extends CommonProps {
  mode: "create";
  session?: undefined;
  defaultCourseId?: string;
  defaultStartDate?: Date;
}

interface EditProps extends CommonProps {
  mode: "edit";
  session: EditableSession;
}

export function SessionSheet(props: CreateProps | EditProps) {
  const { open, onOpenChange, courses, instructors, mode } = props;
  const router = useRouter();

  const defaults = React.useMemo<FormInput>(() => {
    if (mode === "edit") {
      const s = props.session;
      return {
        id: s.id,
        courseId: s.courseId,
        instructorId: s.instructorId ?? "",
        title: s.title ?? "",
        startDate: toLocalDatetimeInput(s.startDate) as unknown as Date,
        endDate: toLocalDatetimeInput(s.endDate) as unknown as Date,
        location: s.location ?? "",
        city: s.city ?? "",
        country: s.country ?? "",
        capacity: s.capacity,
        price: (s.price ?? undefined) as CreateInput["price"],
        status: s.status,
        notes: s.notes ?? "",
      };
    }
    const start = props.defaultStartDate ?? nextWeek9am();
    const end = new Date(start.getTime() + 3 * 60 * 60 * 1000); // +3h
    return {
      courseId: props.defaultCourseId ?? props.lockedCourseId ?? "",
      instructorId: "",
      title: "",
      startDate: toLocalDatetimeInput(start) as unknown as Date,
      endDate: toLocalDatetimeInput(end) as unknown as Date,
      location: "",
      city: "",
      country: "",
      capacity: 20,
      price: undefined,
      status: "UPCOMING",
      notes: "",
    };
    // Only re-derive when the identity actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, mode === "edit" ? props.session?.id : props.defaultCourseId]);

  const form = useForm<FormInput>({
    resolver: zodResolver(
      mode === "edit" ? updateSessionSchema : createSessionSchema
    ) as never,
    defaultValues: defaults,
  });

  React.useEffect(() => {
    if (open) form.reset(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaults]);

  const [pending, startTransition] = React.useTransition();

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const res =
        mode === "edit"
          ? await updateSession(values as unknown as UpdateSessionInput)
          : await createSession(values as unknown as CreateSessionInput);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(mode === "edit" ? "Session updated" : "Session created");
      onOpenChange(false);
      router.refresh();
    });
  });

  const lockedCourse = props.lockedCourseId
    ? courses.find((c) => c.id === props.lockedCourseId)
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>
            {mode === "edit" ? "Edit session" : "New session"}
          </SheetTitle>
          <SheetDescription>
            {mode === "edit"
              ? "Update dates, location, capacity or status."
              : "A specific cohort of a course with real dates, location and capacity."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            id="session-form"
            onSubmit={onSubmit}
            className="flex-1 overflow-y-auto px-4 pb-4"
          >
            <FormSection title="What">
              {props.lockedCourseId ? (
                <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-sm">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    Course
                  </span>
                  <div className="mt-0.5 font-medium">
                    {lockedCourse?.name ?? "Selected course"}
                  </div>
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="courseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course</FormLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Pick a course" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {courses.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Optional — e.g. Dubai · March cohort"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Shown in lists. Defaults to the course name if left empty.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instructorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instructor</FormLabel>
                    <Select
                      value={
                        typeof field.value === "string" && field.value
                          ? field.value
                          : "__none"
                      }
                      onValueChange={(v) =>
                        field.onChange(v === "__none" ? "" : v)
                      }
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select instructor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none">Unassigned</SelectItem>
                        {instructors.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {[i.firstName, i.lastName]
                              .filter(Boolean)
                              .join(" ") || "Unnamed"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormSection>

            <FormSectionDivider />

            <FormSection title="When">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Starts</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          value={field.value as unknown as string}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ends</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          value={field.value as unknown as string}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FormSection>

            <FormSectionDivider />

            <FormSection title="Where">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Venue</FormLabel>
                    <FormControl>
                      <Input placeholder="Address or venue name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Dubai" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="UAE" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FormSection>

            <FormSectionDivider />

            <FormSection title="Capacity & pricing">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity (seats)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          step="1"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="1"
                          placeholder="Overrides course base price"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FormSection>

            <FormSectionDivider />

            <FormSection title="Status & notes">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SESSION_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {humanize(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internal notes</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Only visible to your team."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormSection>
          </form>
        </Form>

        <SheetFooter className="border-t border-border/70">
          <div className="flex w-full items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" form="session-form" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              {mode === "edit" ? "Save changes" : "Create session"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function nextWeek9am(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(9, 0, 0, 0);
  return d;
}
