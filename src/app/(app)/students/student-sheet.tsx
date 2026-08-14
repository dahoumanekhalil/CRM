"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
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
import { cn } from "@/lib/utils";

import {
  createStudentSchema,
  updateStudentSchema,
  type CreateStudentInput,
  type UpdateStudentInput,
} from "@/lib/schemas/student";
import { createStudent, updateStudent } from "./actions";
import type { StudentDetail } from "./actions";

type CreateFormInput = z.input<typeof createStudentSchema>;
type FormInput = CreateFormInput & { id?: string };

interface CreateProps {
  mode: "create";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
  student?: undefined;
}

interface EditProps {
  mode: "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: StudentDetail;
}

function toDefaults(s?: StudentDetail): FormInput {
  if (!s) {
    return {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      address: "",
      notes: "",
      tags: [],
    };
  }
  return {
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName ?? "",
    email: s.email ?? "",
    phone: s.phone ?? "",
    dateOfBirth: s.dateOfBirth
      ? s.dateOfBirth.toISOString().slice(0, 10)
      : "",
    address: s.address ?? "",
    notes: s.notes ?? "",
    tags: s.tags,
  };
}

export function StudentSheet(props: CreateProps | EditProps) {
  const { mode, open, onOpenChange } = props;
  const router = useRouter();

  const defaults = React.useMemo(
    () => toDefaults(mode === "edit" ? props.student : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, mode === "edit" ? props.student?.id : null]
  );

  const form = useForm<FormInput>({
    resolver: zodResolver(
      mode === "edit" ? updateStudentSchema : createStudentSchema
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
          ? await updateStudent(values as unknown as UpdateStudentInput)
          : await createStudent(values as unknown as CreateStudentInput);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(mode === "edit" ? "Student updated" : "Student created");
      onOpenChange(false);
      router.refresh();
      if (mode === "create" && res.ok && "onCreated" in props && props.onCreated) {
        props.onCreated(res.data.id);
      }
    });
  });

  // Tags: comma-driven input, chips rendered above.
  const tags = form.watch("tags");
  const [tagDraft, setTagDraft] = React.useState("");

  const addTag = (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    const current = form.getValues("tags") ?? [];
    if (current.includes(value)) return;
    form.setValue("tags", [...current, value].slice(0, 20));
    setTagDraft("");
  };

  const removeTag = (value: string) => {
    const current = form.getValues("tags") ?? [];
    form.setValue(
      "tags",
      current.filter((t) => t !== value)
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>
            {mode === "edit" ? "Edit student" : "New student"}
          </SheetTitle>
          <SheetDescription>
            {mode === "edit"
              ? "Contact info, tags and notes."
              : "Add a student to your CRM. You can register them for a session next."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            id="student-form"
            onSubmit={onSubmit}
            className="flex-1 overflow-y-auto px-4 pb-4"
          >
            <FormSection title="Identity">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input autoFocus {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormSection>

            <FormSectionDivider />

            <FormSection title="Contact">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="name@example.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      Optional but must be unique across students.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+971 …" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormSection>

            <FormSectionDivider />

            <FormSection title="Tags & notes">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tags</label>
                <div className="rounded-md border border-input bg-background p-2 focus-within:ring-2 focus-within:ring-ring/40">
                  {tags && tags.length > 0 ? (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 text-xs"
                          )}
                        >
                          {t}
                          <button
                            type="button"
                            aria-label={`Remove ${t}`}
                            onClick={() => removeTag(t)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <input
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addTag(tagDraft);
                      } else if (
                        e.key === "Backspace" &&
                        tagDraft === "" &&
                        (tags?.length ?? 0) > 0
                      ) {
                        e.preventDefault();
                        removeTag(tags![tags!.length - 1]);
                      }
                    }}
                    onBlur={() => tagDraft && addTag(tagDraft)}
                    placeholder="Type a tag and press Enter…"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={4} placeholder="Anything the team should know…" {...field} />
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
            <Button type="submit" form="student-form" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              {mode === "edit" ? "Save changes" : "Create student"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
