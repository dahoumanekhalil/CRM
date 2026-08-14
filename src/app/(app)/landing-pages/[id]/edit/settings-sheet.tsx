"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
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
  updateLandingPageSettingsSchema,
  type UpdateLandingPageSettingsInput,
} from "@/lib/schemas/landing-page";
import { updateLandingPageSettings } from "../../actions";
import { useEditor } from "./editor-store";
import type { Theme } from "@/lib/landing-blocks/types";

type FormInput = z.input<typeof updateLandingPageSettingsSchema>;
type FormOutput = z.output<typeof updateLandingPageSettingsSchema>;

// Curated color swatches — intentionally restrained per DESIGN.md §5.5.
const COLOR_SWATCHES: Array<{ label: string; value: string }> = [
  { label: "Deep indigo (default)", value: "oklch(0.44 0.19 275)" },
  { label: "Royal blue",  value: "oklch(0.54 0.2 240)" },
  { label: "Emerald",     value: "oklch(0.6 0.17 155)" },
  { label: "Amber",       value: "oklch(0.75 0.16 75)" },
  { label: "Rose",        value: "oklch(0.65 0.19 0)" },
  { label: "Violet",      value: "oklch(0.55 0.24 295)" },
  { label: "Cyan",        value: "oklch(0.65 0.14 210)" },
  { label: "Slate",       value: "oklch(0.45 0.08 265)" },
];

const RADIUS_OPTIONS: Array<{ value: Theme["radius"]; label: string }> = [
  { value: "sm", label: "Sm" },
  { value: "md", label: "Md" },
  { value: "lg", label: "Lg" },
  { value: "xl", label: "Xl" },
];

const ALIGN_OPTIONS: Array<{ value: Theme["align"]; label: string }> = [
  { value: "start", label: "Left" },
  { value: "center", label: "Center" },
];

export function SettingsSheet({
  open,
  onOpenChange,
  page,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: {
    id: string;
    title: string;
    slug: string;
    seoTitle: string | null;
    seoDescription: string | null;
    ogImageUrl: string | null;
  };
}) {
  const router = useRouter();
  const { theme, updateTheme } = useEditor();

  const defaults: FormInput = {
    id: page.id,
    title: page.title,
    slug: page.slug,
    seoTitle: page.seoTitle ?? "",
    seoDescription: page.seoDescription ?? "",
    ogImageUrl: page.ogImageUrl ?? "",
  };

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(updateLandingPageSettingsSchema),
    defaultValues: defaults,
  });

  React.useEffect(() => {
    if (open) form.reset(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, page.id, page.title, page.slug, page.seoTitle, page.seoDescription, page.ogImageUrl]);

  const [pending, startTransition] = React.useTransition();

  const onSubmit = (values: FormOutput) => {
    startTransition(async () => {
      const res = await updateLandingPageSettings(
        values as UpdateLandingPageSettingsInput
      );
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Settings saved");
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Page settings</SheetTitle>
          <SheetDescription>
            Title, URL, SEO and design. Changes autosave.
          </SheetDescription>
        </SheetHeader>

        {/* ── Design section (live via editor store — autosaves automatically) ── */}
        <div className="border-b border-border/70 px-4 py-4">
          <h3 className="mb-4 text-sm font-semibold tracking-tight">Design</h3>

          {/* Primary color */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground/80">
              Primary color
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_SWATCHES.map((swatch) => {
                const active = theme.primary === swatch.value;
                return (
                  <button
                    key={swatch.value}
                    type="button"
                    title={swatch.label}
                    onClick={() => updateTheme({ primary: swatch.value })}
                    className={cn(
                      "relative grid size-7 place-items-center rounded-full border-2 transition-all",
                      active ? "border-foreground scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: `oklch(${swatch.value.split("oklch(")[1]?.replace(")", "") ?? swatch.value})` }}
                  >
                    {active ? (
                      <Check className="size-3.5 text-white drop-shadow-sm" />
                    ) : null}
                  </button>
                );
              })}
              {/* Custom hex/oklch */}
              <label
                className="inline-flex size-7 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-border/70 text-[10px] text-muted-foreground hover:border-border"
                title="Custom color"
              >
                <input
                  type="color"
                  className="sr-only"
                  onChange={(e) => updateTheme({ primary: e.target.value })}
                />
                +
              </label>
            </div>
          </div>

          {/* Border radius */}
          <div className="mt-4 space-y-2">
            <label className="text-xs font-medium text-foreground/80">
              Corner radius
            </label>
            <div className="inline-flex items-center rounded-md border border-input bg-muted/30 p-0.5">
              {RADIUS_OPTIONS.map((opt) => {
                const active = (theme.radius ?? "lg") === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateTheme({ radius: opt.value })}
                    className={cn(
                      "h-7 rounded px-3 text-xs font-medium transition-colors",
                      active
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Alignment */}
          <div className="mt-4 space-y-2">
            <label className="text-xs font-medium text-foreground/80">
              Default text alignment
            </label>
            <div className="inline-flex items-center rounded-md border border-input bg-muted/30 p-0.5">
              {ALIGN_OPTIONS.map((opt) => {
                const active = (theme.align ?? "start") === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateTheme({ align: opt.value })}
                    className={cn(
                      "h-7 rounded px-3 text-xs font-medium transition-colors",
                      active
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Design changes autosave via the canvas autosave — no need to click
            Save settings.
          </p>
        </div>

        {/* ── Page settings form ── */}
        <Form {...form}>
          <form
            id="settings-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex-1 overflow-y-auto px-4 pb-4"
          >
            <FormSection title="General">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Page title</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                          /p/
                        </span>
                        <input
                          {...field}
                          className="h-9 flex-1 bg-transparent pe-3 text-sm outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Must be unique. Lowercase letters, numbers and hyphens only.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormSection>

            <FormSectionDivider />

            <FormSection
              title="SEO & social"
              description="How this page appears in search results and when shared."
            >
              <FormField
                control={form.control}
                name="seoTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SEO title</FormLabel>
                    <FormControl>
                      <Input placeholder="Same as page title if empty" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="seoDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta description</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="~155 characters" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ogImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Social share image URL</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://…" {...field} />
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
            <Button type="submit" form="settings-form" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              Save settings
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
