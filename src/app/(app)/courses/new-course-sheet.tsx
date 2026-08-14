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
  createCourseSchema,
  COURSE_CURRENCIES,
  COURSE_LEVELS,
  COURSE_STATUSES,
  type CreateCourseInput,
} from "@/lib/schemas/course";
import { slugify } from "@/lib/slug";
import { createCourse } from "./actions";

const humanize = (s: string) =>
  s
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

type FormInput = z.input<typeof createCourseSchema>;
type FormOutput = z.output<typeof createCourseSchema>;

const defaultValues: FormInput = {
  name: "",
  slug: "",
  summary: "",
  description: "",
  category: "",
  level: "BEGINNER",
  durationHours: undefined,
  basePrice: undefined,
  currency: "USD",
  imageUrl: "",
  status: "DRAFT",
};

export function NewCourseSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(createCourseSchema),
    defaultValues,
  });

  React.useEffect(() => {
    if (open) form.reset(defaultValues);
  }, [open, form]);

  // Auto-derive slug from name unless the user has typed a custom one.
  const [slugTouched, setSlugTouched] = React.useState(false);
  const name = form.watch("name");
  React.useEffect(() => {
    if (!slugTouched) {
      form.setValue("slug", slugify(name || ""));
    }
  }, [name, slugTouched, form]);

  const [pending, startTransition] = React.useTransition();

  const onSubmit = (values: FormOutput) => {
    startTransition(async () => {
      const res = await createCourse(values as CreateCourseInput);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Course created", {
        description: `/${res.data.slug}`,
      });
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>New course</SheetTitle>
          <SheetDescription>
            Create the offering. You can add sessions, an instructor and a landing page later.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            id="new-course-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex-1 overflow-y-auto px-4 pb-4"
          >
            {/* --- Basic info --- */}
            <FormSection
              title="Basic information"
              description="What this course is and who it's for."
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course name</FormLabel>
                    <FormControl>
                      <Input placeholder="AI Foundations for Business" autoFocus {...field} />
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
                          onChange={(e) => {
                            setSlugTouched(true);
                            field.onChange(e);
                          }}
                          placeholder="ai-foundations-for-business"
                          className="h-9 flex-1 bg-transparent pe-3 text-sm outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Used for the landing page URL. Auto-generated from the name.
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
                        placeholder="One line for cards and search results."
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
                      <Textarea
                        rows={4}
                        placeholder="What students will learn, who it's for…"
                        {...field}
                      />
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
                        <Input placeholder="Marketing, AI, Design…" {...field} />
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

            {/* --- Pricing --- */}
            <FormSection
              title="Pricing"
              description="Base price for a seat. Session-specific prices can override this later."
            >
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
                          placeholder="1490"
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
                        placeholder="24"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormDescription>Approximate total contact hours.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormSection>

            <FormSectionDivider />

            {/* --- Media --- */}
            <FormSection
              title="Media"
              description="Optional. Used on the landing page hero if no override is set."
            >
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cover image URL</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://…"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormSection>

            <FormSectionDivider />

            {/* --- Publishing --- */}
            <FormSection
              title="Publishing"
              description="Drafts are only visible inside Webscale."
            >
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
            <Button type="submit" form="new-course-form" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              Create course
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
