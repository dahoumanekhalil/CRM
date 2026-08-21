"use client";

import * as React from "react";
import { Check, Loader2 } from "lucide-react";
import type { FormField, FormSettings } from "@/lib/forms/types";
import { LocationField } from "@/components/forms/location-field";
import { cn } from "@/lib/utils";

interface Props {
  formId: string;
  fields: FormField[];
  settings: FormSettings;
}

export function EmbedFormClient({ formId, fields, settings }: Props) {
  const [values, setValues] = React.useState<Record<string, string | boolean>>(
    () =>
      Object.fromEntries(
        fields.map((f) => [f.id, f.type === "checkbox" ? false : ""])
      )
  );
  const [status, setStatus] = React.useState<"idle" | "submitting" | "success">(
    "idle"
  );
  const [error, setError] = React.useState<string | null>(null);

  function setValue(id: string, value: string | boolean) {
    setValues((prev) => ({ ...prev, [id]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch(`/api/forms/${formId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setStatus("idle");
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setStatus("success");
    } catch {
      setStatus("idle");
      setError("Network error — please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-green-100 text-green-600">
          <Check className="size-5" />
        </span>
        <div className="space-y-1">
          <h3 className="text-base font-semibold">
            {settings.successHeading || "Thanks!"}
          </h3>
          <p className="text-sm text-gray-500">
            {settings.successMessage || "We received your submission."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {settings.heading ? (
        <h2 className="mb-1 text-lg font-bold text-gray-900">
          {settings.heading}
        </h2>
      ) : null}
      {settings.subheading ? (
        <p className="mb-5 text-sm text-gray-500">{settings.subheading}</p>
      ) : null}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Honeypot */}
        <div aria-hidden="true" style={{ display: "none" }}>
          <input type="text" name="_hp" tabIndex={-1} autoComplete="off" />
        </div>

        {fields.map((field) => (
          <EmbedField
            key={field.id}
            field={field}
            value={values[field.id] ?? ""}
            onChange={(v) => setValue(field.id, v)}
          />
        ))}

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {status === "submitting" ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Sending…
            </>
          ) : (
            settings.submitLabel || "Submit"
          )}
        </button>

        {settings.privacyNote ? (
          <p className="text-center text-xs text-gray-400">{settings.privacyNote}</p>
        ) : null}
      </form>
    </div>
  );
}

function EmbedField({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: string | boolean;
  onChange: (v: string | boolean) => void;
}) {
  const inputClass =
    "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:opacity-50";

  if (field.type === "location") {
    return (
      <div className="space-y-1.5">
        <FieldLabel field={field} />
        <LocationField
          value={value as string}
          onChange={(v) => onChange(v)}
          required={field.required}
          selectClass={inputClass}
        />
        <FieldHelper field={field} />
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="space-y-1.5">
        <FieldLabel field={field} />
        <textarea
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          rows={3}
          className={inputClass}
        />
        <FieldHelper field={field} />
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex items-start gap-2.5 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={value as boolean}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 size-4 rounded border-gray-300"
        />
        <span>
          {field.label}
          {field.required ? (
            <span className="ms-1 text-red-500">*</span>
          ) : null}
        </span>
      </label>
    );
  }

  if (field.type === "select") {
    const options = field.options ?? [];
    return (
      <div className="space-y-1.5">
        <FieldLabel field={field} />
        <select
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={inputClass}
        >
          <option value="">Select an option…</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <FieldHelper field={field} />
      </div>
    );
  }

  if (field.type === "radio") {
    const options = field.options ?? [];
    return (
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium text-gray-700">
          {field.label}
          {field.required ? (
            <span className="ms-1 text-red-500">*</span>
          ) : null}
        </legend>
        <div className="space-y-1">
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name={field.id}
                value={opt}
                checked={value === opt}
                onChange={() => onChange(opt)}
                className="size-4 border-gray-300"
              />
              {opt}
            </label>
          ))}
        </div>
        <FieldHelper field={field} />
      </fieldset>
    );
  }

  const inputType =
    field.type === "email"
      ? "email"
      : field.type === "phone"
      ? "tel"
      : field.type === "number"
      ? "number"
      : field.type === "date"
      ? "date"
      : "text";

  return (
    <div className="space-y-1.5">
      <FieldLabel field={field} />
      <input
        type={inputType}
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        required={field.required}
        className={cn(inputClass, "h-10")}
      />
      <FieldHelper field={field} />
    </div>
  );
}

function FieldLabel({ field }: { field: FormField }) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {field.label}
      {field.required ? <span className="ms-1 text-red-500">*</span> : null}
    </label>
  );
}

function FieldHelper({ field }: { field: FormField }) {
  if (!field.helperText) return null;
  return <p className="text-xs text-gray-400">{field.helperText}</p>;
}
