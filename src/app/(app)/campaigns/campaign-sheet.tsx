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
  createCampaignSchema,
  updateCampaignSchema,
  CAMPAIGN_STATUSES,
  type CreateCampaignInput,
  type UpdateCampaignInput,
} from "@/lib/schemas/campaign";
import { createCampaign, updateCampaign } from "./actions";
import type { CampaignDetail, CampaignRow } from "./actions";

const humanize = (s: string) =>
  s
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

type CreateFormInput = z.input<typeof createCampaignSchema>;
type FormInput = CreateFormInput & { id?: string };

type EditableCampaign = CampaignRow | CampaignDetail;

interface CreateProps {
  mode: "create";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign?: undefined;
}
interface EditProps {
  mode: "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: EditableCampaign;
}

function toDateOnly(d: Date | null | undefined): string {
  if (!d) return "";
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toDefaults(c?: EditableCampaign): FormInput {
  if (!c) {
    return {
      name: "",
      description: "",
      source: "",
      budget: undefined,
      status: "DRAFT",
      startDate: "",
      endDate: "",
    };
  }
  return {
    id: c.id,
    name: c.name,
    description: c.description ?? "",
    source: c.source ?? "",
    budget: c.budget ?? undefined,
    status: c.status,
    startDate: toDateOnly(c.startDate),
    endDate: toDateOnly(c.endDate),
  };
}

export function CampaignSheet(props: CreateProps | EditProps) {
  const { open, onOpenChange, mode } = props;
  const router = useRouter();

  const defaults = React.useMemo(
    () => toDefaults(mode === "edit" ? props.campaign : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, mode === "edit" ? props.campaign?.id : null]
  );

  const form = useForm<FormInput>({
    resolver: zodResolver(
      mode === "edit" ? updateCampaignSchema : createCampaignSchema
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
          ? await updateCampaign(values as unknown as UpdateCampaignInput)
          : await createCampaign(values as unknown as CreateCampaignInput);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(mode === "edit" ? "Campaign updated" : "Campaign created");
      onOpenChange(false);
      router.refresh();
    });
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {mode === "edit" ? "Edit campaign" : "New campaign"}
          </SheetTitle>
          <SheetDescription>
            {mode === "edit"
              ? "Update details, dates or budget."
              : "Group leads by the marketing activity that generated them."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            id="campaign-form"
            onSubmit={onSubmit}
            className="flex-1 overflow-y-auto px-4 pb-4"
          >
            <FormSection title="Basics">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Q1 AI Foundations LinkedIn ads"
                        autoFocus
                        {...field}
                      />
                    </FormControl>
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
                        placeholder="LinkedIn, Google Ads, Newsletter…"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Free-form label. Matches on `utm_source` for auto-attribution
                      later.
                    </FormDescription>
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
                        placeholder="What you're running, who it's aimed at, why."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormSection>

            <FormSectionDivider />

            <FormSection title="Schedule">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Starts</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
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
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FormSection>

            <FormSectionDivider />

            <FormSection title="Budget & status">
              <FormField
                control={form.control}
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="1"
                        placeholder="5000"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional. Used for ROI hints in the campaign overview.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                        {CAMPAIGN_STATUSES.map((s) => (
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
            <Button type="submit" form="campaign-form" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              {mode === "edit" ? "Save changes" : "Create campaign"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
