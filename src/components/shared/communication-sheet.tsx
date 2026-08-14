"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  createCommunicationSchema,
  COMMUNICATION_TYPES,
  COMMUNICATION_DIRECTIONS,
  type CreateCommunicationInput,
} from "@/lib/schemas/communication";
import { createCommunication } from "@/app/(app)/communications/actions";

const humanize = (s: string) =>
  s
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

type FormInput = z.input<typeof createCommunicationSchema>;

const TYPE_LABELS: Record<string, string> = {
  CALL: "Call",
  EMAIL: "Email",
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
  MEETING: "Meeting",
  NOTE: "Note",
};

const NEEDS_SUBJECT: Record<string, boolean> = {
  EMAIL: true,
  MEETING: true,
};

export function CommunicationSheet({
  open,
  onOpenChange,
  leadId,
  studentId,
  defaultType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string;
  studentId?: string;
  defaultType?: CreateCommunicationInput["type"];
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const form = useForm<FormInput>({
    resolver: zodResolver(createCommunicationSchema),
    defaultValues: {
      type: defaultType ?? "CALL",
      direction: "OUTBOUND",
      subject: "",
      body: "",
      sentAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      leadId: leadId ?? "",
      studentId: studentId ?? "",
    },
  });

  const watchedType = form.watch("type");
  const showSubject = NEEDS_SUBJECT[watchedType] ?? false;

  React.useEffect(() => {
    if (open) {
      form.reset({
        type: defaultType ?? "CALL",
        direction: "OUTBOUND",
        subject: "",
        body: "",
        sentAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        leadId: leadId ?? "",
        studentId: studentId ?? "",
      });
    }
  }, [open, defaultType, leadId, studentId, form]);

  function onSubmit(values: FormInput) {
    startTransition(async () => {
      const res = await createCommunication(values as CreateCommunicationInput);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Communication logged");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border/60 p-6">
          <SheetTitle>Log communication</SheetTitle>
          <SheetDescription>
            Record a call, email, note, or any interaction.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-4 p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {COMMUNICATION_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {TYPE_LABELS[t]}
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
                    name="direction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Direction</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {COMMUNICATION_DIRECTIONS.map((d) => (
                              <SelectItem key={d} value={d}>
                                {humanize(d)}
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
                  name="sentAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date &amp; time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {showSubject && (
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Follow-up on course inquiry" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="body"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {watchedType === "NOTE" ? "Note" : "Summary / body"}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          rows={5}
                          placeholder={
                            watchedType === "NOTE"
                              ? "Write your note here…"
                              : "Describe what was discussed or decided…"
                          }
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <SheetFooter className="border-t border-border/60 p-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="animate-spin" />}
                Log communication
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
