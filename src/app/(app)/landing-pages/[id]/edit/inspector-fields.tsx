"use client";

import * as React from "react";
import { GripVertical, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Small building blocks used across every inspector form. Not exported to the
// wider app — they encode inspector-specific conventions (compact labels,
// per-field description as helper text, ~150 char max width).

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium text-foreground/80"
      >
        {label}
      </label>
      {children}
      {hint ? (
        <p className="text-[11px] leading-snug text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  hint?: string;
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "url";
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
      />
    </Field>
  );
}

export function TextAreaField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  hint?: string;
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <Field label={label} hint={hint}>
      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
      />
    </Field>
  );
}

export function SegmentedField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <Field label={label}>
      <div className="inline-flex items-center rounded-md border border-input bg-muted/30 p-0.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "h-7 rounded px-3 text-xs font-medium transition-colors",
              value === opt.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </Field>
  );
}

// Generic repeater used by features / faq / pricing feature list.
// Renders each row and provides drag-free reorder via up/down (kept simple —
// full dnd within the inspector is out of scope for v1).
export function Repeater<T>({
  label,
  hint,
  items,
  onAdd,
  onRemove,
  addLabel,
  renderItem,
  min = 0,
  max = 20,
}: {
  label: string;
  hint?: string;
  items: T[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  addLabel: string;
  renderItem: (item: T, index: number) => React.ReactNode;
  min?: number;
  max?: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground/80">{label}</span>
        <span className="text-[11px] text-muted-foreground">
          {items.length}/{max}
        </span>
      </div>
      {hint ? (
        <p className="text-[11px] leading-snug text-muted-foreground">
          {hint}
        </p>
      ) : null}
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li
            key={i}
            className="rounded-md border border-border/70 bg-muted/20 p-2.5"
          >
            <div className="flex items-start gap-2">
              <span className="mt-1.5 text-muted-foreground">
                <GripVertical className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                {renderItem(item, i)}
              </div>
              <button
                type="button"
                aria-label="Remove"
                onClick={() => onRemove(i)}
                disabled={items.length <= min}
                className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-30"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onAdd}
        disabled={items.length >= max}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-dashed border-border/70 bg-background px-3 text-xs font-medium text-muted-foreground hover:border-border hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
      >
        <Plus className="size-3.5" /> {addLabel}
      </button>
    </div>
  );
}

export function InspectorSection({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 border-t border-border/60 px-4 py-4 first:border-t-0">
      {title ? (
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      ) : null}
      <div className="space-y-3">{children}</div>
    </section>
  );
}
