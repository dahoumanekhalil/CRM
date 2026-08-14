"use client";

import * as React from "react";
import { Check, Loader2 } from "lucide-react";
import type { FormProps } from "@/lib/landing-blocks/types";
import { cn } from "@/lib/utils";

interface Props {
  props: FormProps;
  // Landing pages inject this so the form knows where to attach the lead.
  // When rendered inside the CRM editor preview, `landingPageId` may be null —
  // in that case the form still renders but the submit is disabled with a hint.
  landingPageId?: string | null;
}

export function FormBlock({ props, landingPageId }: Props) {
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
  // Honeypot — never touched by real users; bots auto-fill it.
  const [hp, setHp] = React.useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!landingPageId) return;

    // Capture UTM from the current URL — silently. If they're not there, we
    // just submit without them.
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
              {/* Honeypot — hidden from real users, filled by bots */}
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
              <Field
                label="Full name"
                value={name}
                onChange={setName}
                placeholder="Jane Doe"
                required
                autoComplete="name"
                disabled={disabled}
              />
              <Field
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
                <Field
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

              <button
                type="submit"
                disabled={disabled || status === "submitting"}
                className={cn(
                  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-transform disabled:opacity-60",
                  status !== "submitting" && !disabled && "hover:scale-[1.01]"
                )}
                style={{
                  backgroundColor: "var(--lp-primary, var(--primary))",
                }}
              >
                {status === "submitting" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Sending…
                  </>
                ) : (
                  submitLabel
                )}
              </button>

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

function Field({
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
