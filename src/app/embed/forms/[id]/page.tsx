import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { FormField, FormSettings } from "@/lib/forms/types";
import { EmbedFormClient } from "./embed-form-client";

// Standalone form page for iframe embedding — no app chrome.
export const dynamic = "force-dynamic";

export default async function EmbedFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const form = await prisma.form.findUnique({ where: { id } });
  if (!form) notFound();

  const fields = Array.isArray(form.fields) ? (form.fields as unknown as FormField[]) : [];
  const settings = (form.settings ?? {}) as FormSettings;

  return (
    <div className="p-4">
      <EmbedFormClient formId={form.id} fields={fields} settings={settings} />
    </div>
  );
}
