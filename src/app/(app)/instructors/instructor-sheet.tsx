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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormSection,
  FormSectionDivider,
} from "@/components/primitives/form-section";
import { cn } from "@/lib/utils";

import {
  createInstructorSchema,
  updateInstructorSchema,
  type CreateInstructorInput,
  type UpdateInstructorInput,
} from "@/lib/schemas/instructor";
import {
  createInstructor,
  updateInstructor,
  listUsersForInstructorPicker,
  type InstructorRow,
} from "./actions";

type CreateFormInput = z.input<typeof createInstructorSchema>;
type FormInput = CreateFormInput & { id?: string };

type UserOption = { id: string; name: string | null; email: string };

interface CreateProps {
  mode: "create";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instructor?: undefined;
}

interface EditProps {
  mode: "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instructor: InstructorRow;
}

function toDefaults(i?: InstructorRow): FormInput {
  if (!i) {
    return {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      bio: "",
      expertise: [],
      avatarUrl: "",
      userId: undefined,
    };
  }
  return {
    id: i.id,
    firstName: i.firstName,
    lastName: i.lastName ?? "",
    email: i.email ?? "",
    phone: i.phone ?? "",
    bio: i.bio ?? "",
    expertise: i.expertise,
    avatarUrl: i.avatarUrl ?? "",
    userId: i.userId ?? undefined,
  };
}

export function InstructorSheet(props: CreateProps | EditProps) {
  const { mode, open, onOpenChange } = props;
  const router = useRouter();

  const [users, setUsers] = React.useState<UserOption[]>([]);

  React.useEffect(() => {
    if (open) {
      listUsersForInstructorPicker().then(setUsers).catch(() => setUsers([]));
    }
  }, [open]);

  const defaults = React.useMemo(
    () => toDefaults(mode === "edit" ? props.instructor : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, mode === "edit" ? props.instructor?.id : null]
  );

  const form = useForm<FormInput>({
    resolver: zodResolver(
      mode === "edit" ? updateInstructorSchema : createInstructorSchema
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
          ? await updateInstructor(values as unknown as UpdateInstructorInput)
          : await createInstructor(values as unknown as CreateInstructorInput);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(mode === "edit" ? "Instructor updated" : "Instructor created");
      onOpenChange(false);
      router.refresh();
    });
  });

  const expertise = form.watch("expertise");
  const [expertiseDraft, setExpertiseDraft] = React.useState("");

  const addTag = (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    const current = form.getValues("expertise") ?? [];
    if (current.includes(value)) return;
    form.setValue("expertise", [...current, value].slice(0, 30));
    setExpertiseDraft("");
  };

  const removeTag = (value: string) => {
    const current = form.getValues("expertise") ?? [];
    form.setValue(
      "expertise",
      current.filter((t) => t !== value)
    );
  };

  const currentUserId = form.watch("userId");
  const usersForSelect = React.useMemo(() => {
    if (mode === "edit" && props.instructor.userId) {
      const alreadyLinked = users.find((u) => u.id === props.instructor.userId);
      if (!alreadyLinked) {
        return users;
      }
    }
    return users;
  }, [users, mode, mode === "edit" ? props.instructor?.userId : null]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>
            {mode === "edit" ? "Edit instructor" : "New instructor"}
          </SheetTitle>
          <SheetDescription>
            {mode === "edit"
              ? "Update the instructor's profile and expertise."
              : "Add an instructor who can be assigned to courses and sessions."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            id="instructor-form"
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
                      Optional but must be unique across instructors.
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
            </FormSection>

            <FormSectionDivider />

            <FormSection title="Profile">
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="A short bio shown on landing pages…"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium">Expertise</label>
                <div className="rounded-md border border-input bg-background p-2 focus-within:ring-2 focus-within:ring-ring/40">
                  {expertise && expertise.length > 0 ? (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {expertise.map((t) => (
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
                    value={expertiseDraft}
                    onChange={(e) => setExpertiseDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addTag(expertiseDraft);
                      } else if (
                        e.key === "Backspace" &&
                        expertiseDraft === "" &&
                        (expertise?.length ?? 0) > 0
                      ) {
                        e.preventDefault();
                        removeTag(expertise![expertise!.length - 1]);
                      }
                    }}
                    onBlur={() => expertiseDraft && addTag(expertiseDraft)}
                    placeholder="Type a skill and press Enter…"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Add areas like "Leadership", "Data Science", "Project Management".
                </p>
              </div>
            </FormSection>

            <FormSectionDivider />

            <FormSection title="CRM link">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link to user account</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(v) => field.onChange(v === "none" ? undefined : v)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="No linked account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No linked account</SelectItem>
                        {usersForSelect.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name ?? u.email}
                          </SelectItem>
                        ))}
                        {mode === "edit" &&
                          props.instructor.userId &&
                          !usersForSelect.find(
                            (u) => u.id === props.instructor.userId
                          ) && (
                            <SelectItem value={props.instructor.userId}>
                              {currentUserId}
                            </SelectItem>
                          )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Optional. Links the instructor to a CRM user account.
                    </FormDescription>
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
            <Button type="submit" form="instructor-form" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              {mode === "edit" ? "Save changes" : "Create instructor"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
