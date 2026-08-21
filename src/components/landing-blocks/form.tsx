"use client";

import * as React from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import type { FormProps } from "@/lib/landing-blocks/types";
import type { FormField } from "@/lib/forms/types";
import { LocationField } from "@/components/forms/location-field";
import { cn } from "@/lib/utils";

interface Props {
  props: FormProps;
  // Landing pages inject this so the form knows where to attach the lead.
  // When rendered inside the CRM editor preview, `landingPageId` may be null —
  // in that case the form still renders but the submit is disabled with a hint.
  landingPageId?: string | null;
}

export function FormBlock({ props, landingPageId }: Props) {
  const isLinked = !!props.formId;

  // If linked to a custom form, render the custom form renderer.
  if (isLinked && props.formDefinition) {
    return (
      <LinkedFormBlock
        formId={props.formId!}
        formDefinition={props.formDefinition}
        blockProps={props}
        landingPageId={landingPageId}
      />
    );
  }

  // Editor preview for linked form (definition not yet available).
  if (isLinked && !props.formDefinition) {
    return (
      <section id="register" className="relative bg-muted/30 py-20 md:py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="rounded-2xl border border-dashed border-primary/40 bg-background/50 py-12 text-center">
            <p className="text-sm font-semibold text-primary">Linked form</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The form fields will appear on the published page.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Default inline lead-capture form.
  return <DefaultFormBlock props={props} landingPageId={landingPageId} />;
}

// ─── Linked form (custom fields from the forms library) ───────────────────────

function LinkedFormBlock({
  formId,
  formDefinition,
  blockProps,
  landingPageId,
}: {
  formId: string;
  formDefinition: NonNullable<FormProps["formDefinition"]>;
  blockProps: FormProps;
  landingPageId?: string | null;
}) {
  const { fields, settings } = formDefinition;
  const disabled = !landingPageId;

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
    if (disabled) return;
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

  const heading = blockProps.heading || settings.heading || "Get in touch";
  const subheading = blockProps.subheading || settings.subheading;
  const submitLabel = blockProps.submitLabel || settings.submitLabel || "Submit";
  const successHeading = blockProps.successHeading || settings.successHeading || "Thanks!";
  const successMessage =
    blockProps.successMessage ||
    settings.successMessage ||
    "We received your submission.";
  const privacyNote = blockProps.privacyNote || settings.privacyNote;

  return (
    <section id="register" className="relative bg-muted/30 py-20 md:py-24">
      {disabled ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-2 flex justify-center"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-primary/40 bg-background/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary shadow-sm backdrop-blur">
            Preview only — publish to accept submissions
          </span>
        </div>
      ) : null}
      <div className="mx-auto grid max-w-5xl gap-12 px-6 md:grid-cols-[1.1fr_1fr] md:items-start">
        <div className="space-y-3">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            {heading}
          </h2>
          {subheading ? (
            <p className="max-w-md text-base leading-relaxed text-muted-foreground">
              {subheading}
            </p>
          ) : null}
        </div>

        <div
          className={cn(
            "rounded-2xl border bg-background p-6 shadow-sm md:p-8",
            disabled ? "border-dashed border-primary/40" : "border-border/70"
          )}
        >
          {status === "success" ? (
            <SuccessPanel heading={successHeading} message={successMessage} />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {fields.map((field) => (
                <FormFieldInput
                  key={field.id}
                  field={field}
                  value={values[field.id] ?? ""}
                  onChange={(v) => setValue(field.id, v)}
                  disabled={disabled}
                />
              ))}

              {error ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              <SubmitButton
                label={submitLabel}
                submitting={status === "submitting"}
                disabled={disabled}
              />

              {disabled ? (
                <p className="text-center text-xs text-muted-foreground">
                  Publish this page to accept real submissions.
                </p>
              ) : privacyNote ? (
                <p className="text-center text-xs text-muted-foreground">
                  {privacyNote}
                </p>
              ) : null}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Default lead-capture form ────────────────────────────────────────────────

function DefaultFormBlock({
  props,
  landingPageId,
}: {
  props: FormProps;
  landingPageId?: string | null;
}) {
  const disabled = !landingPageId;
  const [status, setStatus] = React.useState<"idle" | "submitting" | "success">(
    "idle"
  );
  const [error, setError] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [subscribed, setSubscribed] = React.useState(true);
  const [hp, setHp] = React.useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!landingPageId) return;

    const url = new URL(window.location.href);
    const utmSource = url.searchParams.get("utm_source") ?? undefined;
    const utmMedium = url.searchParams.get("utm_medium") ?? undefined;
    const utmCampaign = url.searchParams.get("utm_campaign") ?? undefined;

    setStatus("submitting");
    setError(null);

    try {
      const res = await fetch("/api/leads/from-landing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          landingPageId,
          name,
          email,
          phone,
          message,
          subscribed,
          hp,
          utmSource,
          utmMedium,
          utmCampaign,
        }),
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
      setError("Network problem — please try again.");
    }
  };

  const showPhone = props.showPhone ?? true;
  const showMessage = props.showMessage ?? true;
  const showConsent = props.showConsent ?? true;
  const submitLabel = props.submitLabel || "Request info";

  return (
    <section id="register" className="relative bg-muted/30 py-20 md:py-24">
      {disabled ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-2 flex justify-center"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-primary/40 bg-background/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary shadow-sm backdrop-blur">
            Preview only — publish to accept submissions
          </span>
        </div>
      ) : null}
      <div className="mx-auto grid max-w-5xl gap-12 px-6 md:grid-cols-[1.1fr_1fr] md:items-start">
        <div className="space-y-3">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            {props.heading || "Reserve your seat"}
          </h2>
          {props.subheading ? (
            <p className="max-w-md text-base leading-relaxed text-muted-foreground">
              {props.subheading}
            </p>
          ) : null}
        </div>

        <div
          className={cn(
            "rounded-2xl border bg-background p-6 shadow-sm md:p-8",
            disabled
              ? "border-dashed border-primary/40"
              : "border-border/70"
          )}
        >
          {status === "success" ? (
            <SuccessPanel
              heading={props.successHeading || "Thanks — you're on the list."}
              message={
                props.successMessage ||
                "Our team will get back to you within one business day."
              }
            />
          ) : (
            <form
              onSubmit={onSubmit}
              className="space-y-4"
              noValidate
            >
              <div aria-hidden="true" style={{ display: "none" }}>
                <input
                  type="text"
                  name="hp"
                  value={hp}
                  onChange={(e) => setHp(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>
              <SimpleField
                label="Full name"
                value={name}
                onChange={setName}
                placeholder="Jane Doe"
                required
                autoComplete="name"
                disabled={disabled}
              />
              <SimpleField
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="jane@example.com"
                required
                autoComplete="email"
                disabled={disabled}
              />
              {showPhone ? (
                <SimpleField
                  label="Phone"
                  type="tel"
                  value={phone}
                  onChange={setPhone}
                  placeholder="+971 …"
                  autoComplete="tel"
                  disabled={disabled}
                />
              ) : null}
              {showMessage ? (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Anything we should know?
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    disabled={disabled}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
                  />
                </div>
              ) : null}

              {showConsent ? (
                <label className="flex items-start gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={subscribed}
                    onChange={(e) => setSubscribed(e.target.checked)}
                    disabled={disabled}
                    className="mt-0.5 size-4 rounded border-input"
                  />
                  <span>{props.consentLabel || "Yes, keep me posted about future courses."}</span>
                </label>
              ) : null}

              {error ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              <SubmitButton
                label={submitLabel}
                submitting={status === "submitting"}
                disabled={disabled}
              />

              {disabled ? (
                <p className="text-center text-xs text-muted-foreground">
                  Publish this page to accept real submissions.
                </p>
              ) : props.privacyNote ? (
                <p className="text-center text-xs text-muted-foreground">
                  {props.privacyNote}
                </p>
              ) : null}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Shared field renderers ───────────────────────────────────────────────────

function FormFieldInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FormField;
  value: string | boolean;
  onChange: (v: string | boolean) => void;
  disabled?: boolean;
}) {
  const inputClass =
    "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50";

  if (field.type === "location") {
    return (
      <div className="space-y-1.5">
        <FieldLabel field={field} />
        <LocationField
          value={value as string}
          onChange={(v) => onChange(v)}
          required={field.required}
          disabled={disabled}
          selectClass={inputClass}
        />
        <HelperText field={field} />
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
          disabled={disabled}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
        />
        <HelperText field={field} />
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex items-start gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={value as boolean}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="mt-0.5 size-4 rounded border-input"
        />
        <span>
          {field.label}
          {field.required ? (
            <span className="ms-1 text-destructive">*</span>
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
        <div className="relative">
          <select
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            disabled={disabled}
            className="h-10 w-full appearance-none rounded-md border border-input bg-background pe-8 ps-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
          >
            <option value="">Select an option…</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        <HelperText field={field} />
      </div>
    );
  }

  if (field.type === "radio") {
    const options = field.options ?? [];
    return (
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">
          {field.label}
          {field.required ? (
            <span className="ms-1 text-destructive">*</span>
          ) : null}
        </legend>
        <div className="space-y-1.5">
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={field.id}
                value={opt}
                checked={value === opt}
                onChange={() => onChange(opt)}
                disabled={disabled}
                className="size-4 border-input"
              />
              {opt}
            </label>
          ))}
        </div>
        <HelperText field={field} />
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
        disabled={disabled}
        className={inputClass}
      />
      <HelperText field={field} />
    </div>
  );
}

function FieldLabel({ field }: { field: FormField }) {
  return (
    <label className="text-sm font-medium">
      {field.label}
      {field.required ? (
        <span className="ms-1 text-destructive" aria-hidden>
          *
        </span>
      ) : null}
    </label>
  );
}

function HelperText({ field }: { field: FormField }) {
  if (!field.helperText) return null;
  return <p className="text-xs text-muted-foreground">{field.helperText}</p>;
}

function SubmitButton({
  label,
  submitting,
  disabled,
}: {
  label: string;
  submitting: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled || submitting}
      className={cn(
        "inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-transform disabled:opacity-60",
        !submitting && !disabled && "hover:scale-[1.01]"
      )}
      style={{ backgroundColor: "var(--lp-primary, var(--primary))" }}
    >
      {submitting ? (
        <>
          <Loader2 className="size-4 animate-spin" /> Sending…
        </>
      ) : (
        label
      )}
    </button>
  );
}

function SimpleField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  autoComplete,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">
        {label}
        {required ? (
          <span className="ms-1 text-destructive" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        disabled={disabled}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
      />
    </div>
  );
}

function SuccessPanel({
  heading,
  message,
}: {
  heading: string;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-success/15 text-success">
        <Check className="size-5" />
      </span>
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold">{heading}</h3>
        <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
