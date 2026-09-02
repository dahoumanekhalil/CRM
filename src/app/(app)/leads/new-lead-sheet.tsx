"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "lucide-react";

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

import type { z } from "zod";
import {
  createLeadSchema,
  LEAD_STATUSES,
  type CreateLeadInput,
} from "@/lib/schemas/lead";
import { createLead, type PotentialDuplicate } from "./actions";

type FormInput = z.input<typeof createLeadSchema>;
type FormOutput = z.output<typeof createLeadSchema>;

const humanize = (s: string) =>
  s
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

const defaultValues: FormInput = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  city: "",
  preferredCallTime: "",
  status: "NEW",
  source: "",
  notes: "",
  tags: [],
};

export function NewLeadSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(createLeadSchema),
    defaultValues,
  });

  React.useEffect(() => {
    if (open) form.reset(defaultValues);
  }, [open, form]);

  const [pending, startTransition] = React.useTransition();
  const [duplicates, setDuplicates] = React.useState<PotentialDuplicate[]>([]);
  const [createdId, setCreatedId] = React.useState<string | null>(null);

  // Reset duplicate state when sheet reopens
  React.useEffect(() => {
    if (open) {
      setDuplicates([]);
      setCreatedId(null);
    }
  }, [open]);

  const onSubmit = (values: FormOutput) => {
    startTransition(async () => {
      const res = await createLead(values as CreateLeadInput);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Lead created");
      setCreatedId(res.data.id);
      if (res.data.duplicates.length > 0) {
        setDuplicates(res.data.duplicates);
        // Refresh data in the background but keep sheet open for the banner
        router.refresh();
      } else {
        onOpenChange(false);
        router.refresh();
      }
    });
  };

  const handleDismiss = () => {
    onOpenChange(false);
    if (createdId) router.push(`/leads/${createdId}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>New lead</SheetTitle>
          <SheetDescription>
            Add someone who&apos;s expressed interest. You can always update the details later.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            id="new-lead-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex-1 overflow-y-auto px-4 space-y-5 pb-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane" autoFocus {...field} />
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
                      <Input placeholder="Doe" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="jane@company.com"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+1 555 555 0100"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Algiers"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="preferredCallTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Best time to call</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Morning, After 3 PM"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
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
                        {LEAD_STATUSES.map((s) => (
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
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Website, Referral…"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="Anything worth remembering about this lead…"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormDescription>Only your team can see this.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        {duplicates.length > 0 ? (
          <div className="border-t border-border/70 px-4 pt-4 pb-2 space-y-3">
            <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/5 px-3 py-2.5">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
              <div className="min-w-0 text-sm">
                <p className="font-medium text-foreground">Possible duplicate{duplicates.length > 1 ? "s" : ""} found</p>
                <ul className="mt-1 space-y-0.5">
                  {duplicates.slice(0, 3).map((d) => (
                    <li key={`${d.type}-${d.id}`} className="text-muted-foreground">
                      <a
                        href={d.type === "lead" ? `/leads/${d.id}` : `/students/${d.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground hover:underline"
                      >
                        {d.name || "Unnamed"} ({d.type})
                      </a>{" "}
                      — matched on {d.matchedOn}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Dismiss
              </Button>
              <Button onClick={handleDismiss}>
                View new lead
              </Button>
            </div>
          </div>
        ) : (
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
            <Button type="submit" form="new-lead-form" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              Create lead
            </Button>
          </div>
        </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
