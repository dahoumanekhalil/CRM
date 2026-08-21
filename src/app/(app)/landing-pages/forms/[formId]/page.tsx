import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/primitives/page-header";
import { getForm } from "../actions";
import { FormDetailClient } from "./form-detail-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = await params;
  const form = await getForm(formId);
  return { title: form?.name ?? "Form" };
}

export default async function FormDetailPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = await params;
  const form = await getForm(formId);
  if (!form) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Forms"
        title={form.name}
        description={form.description ?? undefined}
        actions={
          <Button asChild variant="outline">
            <Link href={`/landing-pages/forms/${form.id}/edit`}>
              <Pencil className="size-4" />
              Edit form
            </Link>
          </Button>
        }
      />
      <div className="flex-1 p-6">
        <FormDetailClient form={form} />
      </div>
    </>
  );
}
