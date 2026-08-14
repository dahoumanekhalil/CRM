"use client";

import * as React from "react";
import type {
  BenefitsProps,
  CTAProps,
  CurriculumProps,
  FAQProps,
  FeaturesProps,
  FormProps,
  HeroProps,
  InstructorProps,
  PricingProps,
  SocialProofProps,
  TestimonialsProps,
} from "@/lib/landing-blocks/types";
import {
  Field,
  InspectorSection,
  Repeater,
  SegmentedField,
  TextAreaField,
  TextField,
} from "./inspector-fields";

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
  return (
    <>
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
