"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Building2, Loader2 } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

import { CURRENCIES } from "./constants";
import { updateOrgSettings, type OrgSettingsRow } from "./actions";

const TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "Africa/Cairo", label: "Cairo (GMT+2/+3)" },
  { value: "Africa/Casablanca", label: "Casablanca (GMT+0/+1)" },
  { value: "Africa/Tunis", label: "Tunis (GMT+1)" },
  { value: "Africa/Algiers", label: "Algiers (GMT+1)" },
  { value: "Asia/Dubai", label: "Dubai (GMT+4)" },
  { value: "Asia/Riyadh", label: "Riyadh (GMT+3)" },
  { value: "Asia/Kuwait", label: "Kuwait (GMT+3)" },
  { value: "Asia/Qatar", label: "Qatar (GMT+3)" },
  { value: "Asia/Bahrain", label: "Bahrain (GMT+3)" },
  { value: "Asia/Muscat", label: "Muscat (GMT+4)" },
  { value: "Asia/Baghdad", label: "Baghdad (GMT+3)" },
  { value: "Asia/Amman", label: "Amman (GMT+3)" },
  { value: "Asia/Beirut", label: "Beirut (GMT+2/+3)" },
  { value: "Europe/London", label: "London (GMT+0/+1)" },
  { value: "Europe/Paris", label: "Paris (GMT+1/+2)" },
  { value: "America/New_York", label: "New York (GMT-5/-4)" },
  { value: "America/Los_Angeles", label: "Los Angeles (GMT-8/-7)" },
];

const schema = z.object({
  name: z.string().trim().min(1, "Required").max(120),
  currency: z.enum(CURRENCIES as unknown as [string, ...string[]]),
  timezone: z.string().min(1, "Required"),
});

type FormValues = z.infer<typeof schema>;

export function GeneralTab({ settings }: { settings: OrgSettingsRow }) {
  const [pending, startTransition] = React.useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: settings.name,
      currency: settings.currency,
      timezone: settings.timezone,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const res = await updateOrgSettings(values as { name: string; currency: typeof CURRENCIES[number]; timezone: string });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Settings saved");
      form.reset(values);
    });
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Building2 className="size-4 text-muted-foreground" />
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Organization</h2>
          <p className="text-xs text-muted-foreground">Basic info visible across the app.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border/60 bg-card p-5">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organization name</FormLabel>
                <FormControl>
                  <Input placeholder="Acme Training Co." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default currency</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Used as the default on new payments.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Used for session scheduling display.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button type="submit" size="sm" disabled={pending || !form.formState.isDirty}>
              {pending && <Loader2 className="animate-spin" />}
              Save changes
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
