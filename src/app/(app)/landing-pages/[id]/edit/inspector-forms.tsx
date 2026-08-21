"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type {
  BenefitsProps,
  CarouselProps,
  CountdownProps,
  CTAProps,
  CurriculumProps,
  FAQProps,
  FeaturesProps,
  FormProps,
  GalleryProps,
  HeroProps,
  InstructorProps,
  PricingProps,
  SocialProofProps,
  TestimonialsProps,
  TwoColumnProps,
  VideoProps,
} from "@/lib/landing-blocks/types";
import {
  Field,
  InspectorSection,
  Repeater,
  SegmentedField,
  TextAreaField,
  TextField,
} from "./inspector-fields";
import { useForms } from "./forms-context";

// Small helper — merge a patch into props and dispatch upward.
function patcher<T>(value: T, onChange: (next: T) => void) {
  return (patch: Partial<T>) => onChange({ ...value, ...patch });
}

export function HeroForm({
  value,
  onChange,
}: {
  value: HeroProps;
  onChange: (next: HeroProps) => void;
}) {
  const patch = patcher(value, onChange);
  return (
    <>
      <InspectorSection title="Content">
        <TextField
          label="Eyebrow"
          hint="Small label above the headline."
          value={value.eyebrow}
          onChange={(v) => patch({ eyebrow: v })}
        />
        <TextField
          label="Headline"
          value={value.headline}
          onChange={(v) => patch({ headline: v })}
        />
        <TextAreaField
          label="Subheadline"
          value={value.subheadline}
          onChange={(v) => patch({ subheadline: v })}
        />
      </InspectorSection>
      <InspectorSection title="Call to action">
        <TextField
          label="Button label"
          value={value.ctaLabel}
          onChange={(v) => patch({ ctaLabel: v })}
        />
        <TextField
          label="Button link"
          value={value.ctaHref}
          onChange={(v) => patch({ ctaHref: v })}
          placeholder="#pricing"
        />
      </InspectorSection>
      <InspectorSection title="Media">
        <TextField
          label="Image URL"
          type="url"
          value={value.imageUrl}
          onChange={(v) => patch({ imageUrl: v })}
          placeholder="https://…"
        />
      </InspectorSection>
      <InspectorSection title="Layout">
        <SegmentedField
          label="Alignment"
          value={value.align ?? "start"}
          onChange={(v) => patch({ align: v })}
          options={[
            { value: "start", label: "Start" },
            { value: "center", label: "Center" },
          ]}
        />
      </InspectorSection>
    </>
  );
}

export function FeaturesForm({
  value,
  onChange,
}: {
  value: FeaturesProps;
  onChange: (next: FeaturesProps) => void;
}) {
  const patch = patcher(value, onChange);
  const setItem = (i: number, next: Partial<FeaturesProps["items"][number]>) => {
    const items = value.items.map((it, idx) =>
      idx === i ? { ...it, ...next } : it
    );
    patch({ items });
  };

  return (
    <>
      <InspectorSection title="Heading">
        <TextField
          label="Heading"
          value={value.heading}
          onChange={(v) => patch({ heading: v })}
        />
        <TextAreaField
          label="Subheading"
          value={value.subheading}
          onChange={(v) => patch({ subheading: v })}
        />
      </InspectorSection>
      <InspectorSection title="Items">
        <Repeater
          label="Feature items"
          items={value.items}
          min={1}
          max={12}
          addLabel="Add feature"
          onAdd={() =>
            patch({
              items: [
                ...value.items,
                { title: "New feature", description: "" },
              ],
            })
          }
          onRemove={(i) =>
            patch({ items: value.items.filter((_, idx) => idx !== i) })
          }
          renderItem={(item, i) => (
            <>
              <TextField
                label="Title"
                value={item.title}
                onChange={(v) => setItem(i, { title: v })}
              />
              <TextAreaField
                label="Description"
                rows={2}
                value={item.description}
                onChange={(v) => setItem(i, { description: v })}
              />
            </>
          )}
        />
      </InspectorSection>
    </>
  );
}

export function InstructorForm({
  value,
  onChange,
}: {
  value: InstructorProps;
  onChange: (next: InstructorProps) => void;
}) {
  const patch = patcher(value, onChange);
  const expertise = value.expertise ?? [];
  return (
    <>
      <InspectorSection title="Heading">
        <TextField
          label="Section heading"
          value={value.heading}
          onChange={(v) => patch({ heading: v })}
        />
      </InspectorSection>
      <InspectorSection title="Instructor">
        <TextField
          label="Name"
          value={value.name}
          onChange={(v) => patch({ name: v })}
        />
        <TextField
          label="Title"
          value={value.title}
          onChange={(v) => patch({ title: v })}
        />
        <TextAreaField
          label="Bio"
          rows={4}
          value={value.bio}
          onChange={(v) => patch({ bio: v })}
        />
        <TextField
          label="Avatar image URL"
          type="url"
          value={value.avatarUrl}
          onChange={(v) => patch({ avatarUrl: v })}
          placeholder="https://…"
        />
      </InspectorSection>
      <InspectorSection title="Expertise">
        <Repeater
          label="Expertise tags"
          items={expertise}
          max={12}
          addLabel="Add tag"
          onAdd={() => patch({ expertise: [...expertise, "New tag"] })}
          onRemove={(i) =>
            patch({ expertise: expertise.filter((_, idx) => idx !== i) })
          }
          renderItem={(item, i) => (
            <TextField
              label={`Tag ${i + 1}`}
              value={item}
              onChange={(v) => {
                const next = expertise.map((t, idx) => (idx === i ? v : t));
                patch({ expertise: next });
              }}
            />
          )}
        />
      </InspectorSection>
    </>
  );
}

export function PricingForm({
  value,
  onChange,
}: {
  value: PricingProps;
  onChange: (next: PricingProps) => void;
}) {
  const patch = patcher(value, onChange);
  return (
    <>
      <InspectorSection title="Heading">
        <TextField
          label="Heading"
          value={value.heading}
          onChange={(v) => patch({ heading: v })}
        />
      </InspectorSection>
      <InspectorSection title="Price">
        <div className="grid grid-cols-3 gap-2">
          <TextField
            label="Amount"
            value={value.price}
            onChange={(v) => patch({ price: v })}
            placeholder="1,490"
          />
          <TextField
            label="Currency"
            value={value.currency}
            onChange={(v) => patch({ currency: v })}
            placeholder="USD"
          />
          <TextField
            label="Period"
            value={value.period}
            onChange={(v) => patch({ period: v })}
            placeholder="per seat"
          />
        </div>
        <TextField
          label="Note"
          hint="Small text under the price (e.g. VAT included)."
          value={value.note}
          onChange={(v) => patch({ note: v })}
        />
      </InspectorSection>
      <InspectorSection title="Included">
        <Repeater
          label="Feature list"
          items={value.features}
          max={20}
          addLabel="Add item"
          onAdd={() => patch({ features: [...value.features, "New item"] })}
          onRemove={(i) =>
            patch({ features: value.features.filter((_, idx) => idx !== i) })
          }
          renderItem={(item, i) => (
            <TextField
              label={`Item ${i + 1}`}
              value={item}
              onChange={(v) => {
                const next = value.features.map((t, idx) =>
                  idx === i ? v : t
                );
                patch({ features: next });
              }}
            />
          )}
        />
      </InspectorSection>
      <InspectorSection title="Call to action">
        <TextField
          label="Button label"
          value={value.ctaLabel}
          onChange={(v) => patch({ ctaLabel: v })}
        />
        <TextField
          label="Button link"
          value={value.ctaHref}
          onChange={(v) => patch({ ctaHref: v })}
        />
      </InspectorSection>
    </>
  );
}

export function FAQForm({
  value,
  onChange,
}: {
  value: FAQProps;
  onChange: (next: FAQProps) => void;
}) {
  const patch = patcher(value, onChange);
  const setItem = (i: number, next: Partial<FAQProps["items"][number]>) => {
    const items = value.items.map((it, idx) =>
      idx === i ? { ...it, ...next } : it
    );
    patch({ items });
  };

  return (
    <>
      <InspectorSection title="Heading">
        <TextField
          label="Section heading"
          value={value.heading}
          onChange={(v) => patch({ heading: v })}
        />
      </InspectorSection>
      <InspectorSection title="Questions">
        <Repeater
          label="Q&A items"
          items={value.items}
          min={1}
          max={20}
          addLabel="Add question"
          onAdd={() =>
            patch({
              items: [
                ...value.items,
                { question: "New question", answer: "Answer here." },
              ],
            })
          }
          onRemove={(i) =>
            patch({ items: value.items.filter((_, idx) => idx !== i) })
          }
          renderItem={(item, i) => (
            <>
              <TextField
                label="Question"
                value={item.question}
                onChange={(v) => setItem(i, { question: v })}
              />
              <TextAreaField
                label="Answer"
                rows={3}
                value={item.answer}
                onChange={(v) => setItem(i, { answer: v })}
              />
            </>
          )}
        />
      </InspectorSection>
    </>
  );
}

export function CTAForm({
  value,
  onChange,
}: {
  value: CTAProps;
  onChange: (next: CTAProps) => void;
}) {
  const patch = patcher(value, onChange);
  return (
    <>
      <InspectorSection title="Content">
        <TextField
          label="Headline"
          value={value.headline}
          onChange={(v) => patch({ headline: v })}
        />
        <TextAreaField
          label="Subheadline"
          value={value.subheadline}
          onChange={(v) => patch({ subheadline: v })}
        />
      </InspectorSection>
      <InspectorSection title="Button">
        <TextField
          label="Button label"
          value={value.ctaLabel}
          onChange={(v) => patch({ ctaLabel: v })}
        />
        <TextField
          label="Button link"
          value={value.ctaHref}
          onChange={(v) => patch({ ctaHref: v })}
          placeholder="#register"
        />
      </InspectorSection>
    </>
  );
}

export function FormForm({
  value,
  onChange,
}: {
  value: FormProps;
  onChange: (next: FormProps) => void;
}) {
  const patch = patcher(value, onChange);
  const forms = useForms();
  const linkedForm = forms.find((f) => f.id === value.formId);
  const useLinked = !!value.formId;

  return (
    <>
      {/* Link to a form from the library */}
      <InspectorSection title="Linked form">
        <p className="mb-2 text-xs text-muted-foreground">
          Link to a form from the forms library to use custom fields and collect
          all submissions in one place.
        </p>
        <div className="space-y-2">
          <select
            value={value.formId ?? ""}
            onChange={(e) =>
              patch({ formId: e.target.value || undefined })
            }
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring"
          >
            <option value="">— Use default fields —</option>
            {forms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.fieldCount} fields)
              </option>
            ))}
          </select>
          {linkedForm ? (
            <Link
              href={`/landing-pages/forms/${linkedForm.id}/edit`}
              target="_blank"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="size-3" />
              Edit "{linkedForm.name}"
            </Link>
          ) : null}
          {forms.length === 0 ? (
            <Link
              href="/landing-pages/forms/new"
              target="_blank"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="size-3" />
              Create a form
            </Link>
          ) : null}
        </div>
      </InspectorSection>

      {/* Heading — shown for both modes */}
      <InspectorSection title="Heading">
        <TextField
          label="Section heading"
          value={value.heading}
          onChange={(v) => patch({ heading: v })}
        />
        <TextAreaField
          label="Subheading"
          value={value.subheading}
          onChange={(v) => patch({ subheading: v })}
        />
      </InspectorSection>

      {/* Default fields — only shown when NOT linked */}
      {!useLinked ? (
        <InspectorSection title="Fields">
          <ToggleField
            label="Show phone field"
            value={value.showPhone ?? true}
            onChange={(v) => patch({ showPhone: v })}
          />
          <ToggleField
            label="Show message field"
            value={value.showMessage ?? true}
            onChange={(v) => patch({ showMessage: v })}
          />
          <ToggleField
            label="Show consent checkbox"
            value={value.showConsent ?? true}
            onChange={(v) => patch({ showConsent: v })}
          />
          <TextField
            label="Consent label"
            value={value.consentLabel}
            onChange={(v) => patch({ consentLabel: v })}
          />
        </InspectorSection>
      ) : null}

      <InspectorSection title="Submit">
        <TextField
          label="Button label"
          value={value.submitLabel}
          onChange={(v) => patch({ submitLabel: v })}
        />
        <TextAreaField
          label="Privacy note"
          hint="Shown under the button — reassures visitors about their data."
          value={value.privacyNote}
          onChange={(v) => patch({ privacyNote: v })}
        />
      </InspectorSection>
      <InspectorSection title="After submit">
        <TextField
          label="Success heading"
          value={value.successHeading}
          onChange={(v) => patch({ successHeading: v })}
        />
        <TextAreaField
          label="Success message"
          value={value.successMessage}
          onChange={(v) => patch({ successMessage: v })}
        />
      </InspectorSection>
    </>
  );
}

export function TestimonialsForm({
  value,
  onChange,
}: {
  value: TestimonialsProps;
  onChange: (next: TestimonialsProps) => void;
}) {
  const patch = patcher(value, onChange);
  const setItem = (i: number, next: Partial<TestimonialsProps["items"][number]>) => {
    const items = value.items.map((it, idx) =>
      idx === i ? { ...it, ...next } : it
    );
    patch({ items });
  };

  return (
    <>
      <InspectorSection title="Heading">
        <TextField
          label="Heading"
          value={value.heading}
          onChange={(v) => patch({ heading: v })}
        />
        <TextAreaField
          label="Subheading"
          value={value.subheading}
          onChange={(v) => patch({ subheading: v })}
        />
      </InspectorSection>
      <InspectorSection title="Reviews">
        <Repeater
          label="Testimonial items"
          items={value.items}
          min={1}
          max={12}
          addLabel="Add testimonial"
          onAdd={() =>
            patch({
              items: [
                ...value.items,
                { quote: "Testimonial text here.", name: "Student Name" },
              ],
            })
          }
          onRemove={(i) =>
            patch({ items: value.items.filter((_, idx) => idx !== i) })
          }
          renderItem={(item, i) => (
            <>
              <TextAreaField
                label="Quote"
                rows={3}
                value={item.quote}
                onChange={(v) => setItem(i, { quote: v })}
              />
              <TextField
                label="Name"
                value={item.name}
                onChange={(v) => setItem(i, { name: v })}
              />
              <TextField
                label="Role"
                value={item.role}
                onChange={(v) => setItem(i, { role: v })}
              />
              <Field label="Rating (1–5)">
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={item.rating ?? ""}
                  onChange={(e) =>
                    setItem(i, {
                      rating: e.target.value === "" ? undefined : Number(e.target.value),
                    })
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </Field>
            </>
          )}
        />
      </InspectorSection>
    </>
  );
}

export function BenefitsForm({
  value,
  onChange,
}: {
  value: BenefitsProps;
  onChange: (next: BenefitsProps) => void;
}) {
  const patch = patcher(value, onChange);

  return (
    <>
      <InspectorSection title="Heading">
        <TextField
          label="Heading"
          value={value.heading}
          onChange={(v) => patch({ heading: v })}
        />
        <TextAreaField
          label="Subheading"
          value={value.subheading}
          onChange={(v) => patch({ subheading: v })}
        />
      </InspectorSection>
      <InspectorSection title="Layout">
        <SegmentedField
          label="Columns"
          value={String(value.columns ?? 2) as "1" | "2"}
          onChange={(v) => patch({ columns: Number(v) as 1 | 2 })}
          options={[
            { value: "1", label: "1 column" },
            { value: "2", label: "2 columns" },
          ]}
        />
      </InspectorSection>
      <InspectorSection title="Items">
        <Repeater
          label="Benefit items"
          items={value.items}
          min={1}
          max={20}
          addLabel="Add benefit"
          onAdd={() => patch({ items: [...value.items, "New benefit"] })}
          onRemove={(i) =>
            patch({ items: value.items.filter((_, idx) => idx !== i) })
          }
          renderItem={(item, i) => (
            <TextField
              label={`Item ${i + 1}`}
              value={item}
              onChange={(v) => {
                const next = value.items.map((t, idx) => (idx === i ? v : t));
                patch({ items: next });
              }}
            />
          )}
        />
      </InspectorSection>
    </>
  );
}

export function CurriculumForm({
  value,
  onChange,
}: {
  value: CurriculumProps;
  onChange: (next: CurriculumProps) => void;
}) {
  const patch = patcher(value, onChange);
  const setModule = (i: number, next: Partial<CurriculumProps["modules"][number]>) => {
    const modules = value.modules.map((m, idx) =>
      idx === i ? { ...m, ...next } : m
    );
    patch({ modules });
  };

  return (
    <>
      <InspectorSection title="Heading">
        <TextField
          label="Heading"
          value={value.heading}
          onChange={(v) => patch({ heading: v })}
        />
        <TextAreaField
          label="Subheading"
          value={value.subheading}
          onChange={(v) => patch({ subheading: v })}
        />
      </InspectorSection>
      <InspectorSection title="Modules">
        <Repeater
          label="Modules"
          items={value.modules}
          min={1}
          max={20}
          addLabel="Add module"
          onAdd={() =>
            patch({
              modules: [
                ...value.modules,
                { title: "New module", lessons: ["Lesson 1"] },
              ],
            })
          }
          onRemove={(i) =>
            patch({ modules: value.modules.filter((_, idx) => idx !== i) })
          }
          renderItem={(mod, i) => (
            <>
              <TextField
                label="Module title"
                value={mod.title}
                onChange={(v) => setModule(i, { title: v })}
              />
              <TextField
                label="Duration"
                value={mod.duration}
                onChange={(v) => setModule(i, { duration: v })}
                placeholder="e.g. 2 hours"
              />
              <Repeater
                label="Lessons"
                items={mod.lessons}
                max={20}
                addLabel="Add lesson"
                onAdd={() =>
                  setModule(i, { lessons: [...mod.lessons, "New lesson"] })
                }
                onRemove={(j) =>
                  setModule(i, {
                    lessons: mod.lessons.filter((_, idx) => idx !== j),
                  })
                }
                renderItem={(lesson, j) => (
                  <TextField
                    label={`Lesson ${j + 1}`}
                    value={lesson}
                    onChange={(v) => {
                      const next = mod.lessons.map((l, idx) =>
                        idx === j ? v : l
                      );
                      setModule(i, { lessons: next });
                    }}
                  />
                )}
              />
            </>
          )}
        />
      </InspectorSection>
    </>
  );
}

export function SocialProofForm({
  value,
  onChange,
}: {
  value: SocialProofProps;
  onChange: (next: SocialProofProps) => void;
}) {
  const patch = patcher(value, onChange);
  const setStat = (i: number, next: Partial<SocialProofProps["stats"][number]>) => {
    const stats = value.stats.map((s, idx) =>
      idx === i ? { ...s, ...next } : s
    );
    patch({ stats });
  };

  return (
    <>
      <InspectorSection title="Heading">
        <TextField
          label="Heading"
          value={value.heading}
          onChange={(v) => patch({ heading: v })}
        />
      </InspectorSection>
      <InspectorSection title="Stats">
        <Repeater
          label="Stats"
          items={value.stats}
          min={1}
          max={8}
          addLabel="Add stat"
          onAdd={() =>
            patch({ stats: [...value.stats, { value: "0", label: "Label" }] })
          }
          onRemove={(i) =>
            patch({ stats: value.stats.filter((_, idx) => idx !== i) })
          }
          renderItem={(stat, i) => (
            <>
              <TextField
                label="Value"
                value={stat.value}
                onChange={(v) => setStat(i, { value: v })}
                placeholder="e.g. 2,400+"
              />
              <TextField
                label="Label"
                value={stat.label}
                onChange={(v) => setStat(i, { label: v })}
                placeholder="e.g. students trained"
              />
            </>
          )}
        />
      </InspectorSection>
      <InspectorSection title="Footer">
        <TextField
          label="Note"
          hint="Small text shown below the stats."
          value={value.note}
          onChange={(v) => patch({ note: v })}
        />
      </InspectorSection>
    </>
  );
}

function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-xs">
      <span className="text-foreground/80">{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-input"
      />
    </label>
  );
}

// ── Video ─────────────────────────────────────────────────────────────────────

export function VideoForm({
  value,
  onChange,
}: {
  value: VideoProps;
  onChange: (next: VideoProps) => void;
}) {
  const patch = patcher(value, onChange);
  return (
    <>
      <InspectorSection title="Content">
        <TextField
          label="Heading"
          value={value.heading}
          onChange={(v) => patch({ heading: v })}
        />
        <TextAreaField
          label="Subheading"
          value={value.subheading}
          onChange={(v) => patch({ subheading: v })}
        />
      </InspectorSection>
      <InspectorSection title="Video">
        <TextField
          label="YouTube or Vimeo URL"
          hint="Paste any YouTube or Vimeo link — we'll embed it automatically."
          type="url"
          value={value.url}
          onChange={(v) => patch({ url: v })}
          placeholder="https://youtube.com/watch?v=…"
        />
        <SegmentedField
          label="Aspect ratio"
          value={value.aspectRatio ?? "16/9"}
          onChange={(v) => patch({ aspectRatio: v })}
          options={[
            { value: "16/9", label: "16:9" },
            { value: "4/3", label: "4:3" },
            { value: "1/1", label: "Square" },
          ]}
        />
        <TextField
          label="Caption"
          hint="Optional text shown below the video."
          value={value.caption}
          onChange={(v) => patch({ caption: v })}
        />
      </InspectorSection>
    </>
  );
}

// ── Gallery ───────────────────────────────────────────────────────────────────

export function GalleryForm({
  value,
  onChange,
}: {
  value: GalleryProps;
  onChange: (next: GalleryProps) => void;
}) {
  const patch = patcher(value, onChange);
  const setImg = (i: number, next: Partial<GalleryProps["images"][number]>) => {
    const images = value.images.map((img, idx) =>
      idx === i ? { ...img, ...next } : img
    );
    patch({ images });
  };

  return (
    <>
      <InspectorSection title="Heading">
        <TextField
          label="Heading"
          value={value.heading}
          onChange={(v) => patch({ heading: v })}
        />
        <TextAreaField
          label="Subheading"
          value={value.subheading}
          onChange={(v) => patch({ subheading: v })}
        />
      </InspectorSection>
      <InspectorSection title="Layout">
        <SegmentedField
          label="Columns"
          value={String(value.columns ?? 3) as "2" | "3" | "4"}
          onChange={(v) => patch({ columns: Number(v) as 2 | 3 | 4 })}
          options={[
            { value: "2", label: "2" },
            { value: "3", label: "3" },
            { value: "4", label: "4" },
          ]}
        />
      </InspectorSection>
      <InspectorSection title="Images">
        <Repeater
          label="Images"
          items={value.images}
          min={1}
          max={20}
          addLabel="Add image"
          onAdd={() => patch({ images: [...value.images, { url: "", caption: "" }] })}
          onRemove={(i) => patch({ images: value.images.filter((_, idx) => idx !== i) })}
          renderItem={(img, i) => (
            <>
              <TextField
                label="Image URL"
                type="url"
                value={img.url}
                onChange={(v) => setImg(i, { url: v })}
                placeholder="https://…"
              />
              <TextField
                label="Caption (optional)"
                value={img.caption}
                onChange={(v) => setImg(i, { caption: v })}
              />
            </>
          )}
        />
      </InspectorSection>
    </>
  );
}

// ── Carousel ──────────────────────────────────────────────────────────────────

export function CarouselForm({
  value,
  onChange,
}: {
  value: CarouselProps;
  onChange: (next: CarouselProps) => void;
}) {
  const patch = patcher(value, onChange);
  const setSlide = (i: number, next: Partial<CarouselProps["slides"][number]>) => {
    const slides = value.slides.map((s, idx) =>
      idx === i ? { ...s, ...next } : s
    );
    patch({ slides });
  };

  return (
    <>
      <InspectorSection title="Heading">
        <TextField
          label="Heading"
          value={value.heading}
          onChange={(v) => patch({ heading: v })}
        />
        <TextAreaField
          label="Subheading"
          value={value.subheading}
          onChange={(v) => patch({ subheading: v })}
        />
      </InspectorSection>
      <InspectorSection title="Settings">
        <ToggleField
          label="Auto-play"
          value={value.autoPlay ?? true}
          onChange={(v) => patch({ autoPlay: v })}
        />
      </InspectorSection>
      <InspectorSection title="Slides">
        <Repeater
          label="Slides"
          items={value.slides}
          min={1}
          max={20}
          addLabel="Add slide"
          onAdd={() =>
            patch({ slides: [...value.slides, { imageUrl: "", title: "", description: "" }] })
          }
          onRemove={(i) => patch({ slides: value.slides.filter((_, idx) => idx !== i) })}
          renderItem={(slide, i) => (
            <>
              <TextField
                label="Image URL"
                type="url"
                value={slide.imageUrl}
                onChange={(v) => setSlide(i, { imageUrl: v })}
                placeholder="https://…"
              />
              <TextField
                label="Badge (optional)"
                value={slide.badge}
                onChange={(v) => setSlide(i, { badge: v })}
                placeholder="e.g. Day 1"
              />
              <TextField
                label="Title (optional)"
                value={slide.title}
                onChange={(v) => setSlide(i, { title: v })}
              />
              <TextField
                label="Description (optional)"
                value={slide.description}
                onChange={(v) => setSlide(i, { description: v })}
              />
            </>
          )}
        />
      </InspectorSection>
    </>
  );
}

// ── Countdown ─────────────────────────────────────────────────────────────────

export function CountdownForm({
  value,
  onChange,
}: {
  value: CountdownProps;
  onChange: (next: CountdownProps) => void;
}) {
  const patch = patcher(value, onChange);
  return (
    <>
      <InspectorSection title="Content">
        <TextField
          label="Heading"
          value={value.heading}
          onChange={(v) => patch({ heading: v })}
        />
        <TextAreaField
          label="Subheading"
          value={value.subheading}
          onChange={(v) => patch({ subheading: v })}
        />
      </InspectorSection>
      <InspectorSection title="Deadline">
        <Field label="Target date & time" hint="When the countdown reaches zero, the expired message is shown.">
          <input
            type="datetime-local"
            value={value.targetDate ?? ""}
            onChange={(e) => patch({ targetDate: e.target.value })}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-shadow focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </Field>
        <TextField
          label="Expired message"
          hint="Shown after the deadline passes."
          value={value.expiredMessage}
          onChange={(v) => patch({ expiredMessage: v })}
          placeholder="Registration is now closed."
        />
      </InspectorSection>
      <InspectorSection title="Call to action">
        <TextField
          label="Button label"
          value={value.ctaLabel}
          onChange={(v) => patch({ ctaLabel: v })}
        />
        <TextField
          label="Button link"
          type="url"
          value={value.ctaHref}
          onChange={(v) => patch({ ctaHref: v })}
          placeholder="#register"
        />
      </InspectorSection>
    </>
  );
}

// ── Two-column ────────────────────────────────────────────────────────────────

export function TwoColumnForm({
  value,
  onChange,
}: {
  value: TwoColumnProps;
  onChange: (next: TwoColumnProps) => void;
}) {
  const patch = patcher(value, onChange);
  return (
    <>
      <InspectorSection title="Content">
        <TextField
          label="Eyebrow"
          hint="Small label above the heading."
          value={value.eyebrow}
          onChange={(v) => patch({ eyebrow: v })}
        />
        <TextField
          label="Heading"
          value={value.heading}
          onChange={(v) => patch({ heading: v })}
        />
        <TextAreaField
          label="Body"
          rows={4}
          value={value.body}
          onChange={(v) => patch({ body: v })}
        />
      </InspectorSection>
      <InspectorSection title="Call to action">
        <TextField
          label="Button label"
          value={value.ctaLabel}
          onChange={(v) => patch({ ctaLabel: v })}
        />
        <TextField
          label="Button link"
          type="url"
          value={value.ctaHref}
          onChange={(v) => patch({ ctaHref: v })}
          placeholder="#register"
        />
      </InspectorSection>
      <InspectorSection title="Image">
        <TextField
          label="Image URL"
          type="url"
          value={value.imageUrl}
          onChange={(v) => patch({ imageUrl: v })}
          placeholder="https://…"
        />
        <TextField
          label="Alt text"
          hint="Describe the image for screen readers."
          value={value.imageAlt}
          onChange={(v) => patch({ imageAlt: v })}
        />
      </InspectorSection>
      <InspectorSection title="Layout">
        <SegmentedField
          label="Image position"
          value={value.layout ?? "image-right"}
          onChange={(v) => patch({ layout: v })}
          options={[
            { value: "image-right", label: "Right" },
            { value: "image-left", label: "Left" },
          ]}
        />
      </InspectorSection>
    </>
  );
}
