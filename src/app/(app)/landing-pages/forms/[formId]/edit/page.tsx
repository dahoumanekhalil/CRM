import { notFound } from "next/navigation";
import { getForm } from "../../actions";
import { FormEditorClient } from "./form-editor-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = await params;
  const form = await getForm(formId);
  return { title: form ? `Edit — ${form.name}` : "Edit form" };
}

export default async function FormEditorPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = await params;
  const form = await getForm(formId);
  if (!form) notFound();

  return <FormEditorClient form={form} />;
}
