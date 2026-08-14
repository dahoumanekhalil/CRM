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
  updateCourseSchema,
  COURSE_CURRENCIES,
  COURSE_LEVELS,
  COURSE_STATUSES,
  type UpdateCourseInput,
} from "@/lib/schemas/course";
import type { CourseDetail } from "../actions";
import { updateCourse } from "../actions";

const humanize = (s: string) =>
  s
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

type FormInput = z.input<typeof updateCourseSchema>;
type FormOutput = z.output<typeof updateCourseSchema>;

function toDefaults(course: CourseDetail["course"]): FormInput {
  return {
    id: course.id,
    name: course.name,
    slug: course.slug,
    summary: course.summary ?? "",
    description: course.description ?? "",
    category: course.category ?? "",
    level: course.level,
    durationHours: course.durationHours ?? undefined,
    basePrice: course.basePrice ?? undefined,
    currency: course.currency as FormInput["currency"],
    imageUrl: course.imageUrl ?? "",
    status: course.status,
  };
}

export function EditCourseSheet({
  open,
  onOpenChange,
  course,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: CourseDetail["course"];
}) {
  const router = useRouter();
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(updateCourseSchema),
    defaultValues: toDefaults(course),
  });

  React.useEffect(() => {
    if (open) form.reset(toDefaults(course));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, course.id]);

  const [pending, startTransition] = React.useTransition();
  const originalSlug = course.slug;

  const onSubmit = (values: FormOutput) => {
    startTransition(async () => {
      const res = await updateCourse(values as UpdateCourseInput);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Course updated");
      onOpenChange(false);
      if (res.data.slug !== originalSlug) {
        router.push(`/courses/${res.data.slug}`);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Edit course</SheetTitle>
          <SheetDescription>
            Everything a landing page pulls from — description, price, level.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            id="edit-course-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex-1 overflow-y-auto px-4 pb-4"
          >
            <FormSection title="Basic information">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course name</FormLabel>
                    <FormControl>
                      <Input autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL slug</FormLabel>
                    <FormControl>
                      <div className="flex items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring/40 focus-within:border-ring">
                        <span className="ps-3 pe-1 text-sm text-muted-foreground select-none">
                          /
                        </span>
                        <input
                          {...field}
                          className="h-9 flex-1 bg-transparent pe-3 text-sm outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Changing this will redirect landing pages to the new URL.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Summary</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="One line for cards and search."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea rows={5} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Level</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COURSE_LEVELS.map((l) => (
                            <SelectItem key={l} value={l}>
                              {humanize(l)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FormSection>

            <FormSectionDivider />

            <FormSection title="Pricing">
              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="basePrice"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Base price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
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
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COURSE_CURRENCIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="durationHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (hours)</FormLabel>
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
            </FormSection>

            <FormSectionDivider />

            <FormSection title="Media">
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cover image URL</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormSection>

            <FormSectionDivider />

            <FormSection title="Publishing">
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
                        {COURSE_STATUSES.map((s) => (
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
            <Button type="submit" form="edit-course-form" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              Save changes
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
