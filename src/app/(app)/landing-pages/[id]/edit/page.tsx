import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseBlocks, parseTheme } from "@/lib/landing-blocks/schemas";
import { EditClient } from "./edit-client";
import type { FormField } from "@/lib/forms/types";

export const metadata = { title: "Edit landing page" };

export default async function EditLandingPage({
  params,
}: PageProps<"/landing-pages/[id]/edit">) {
  const { id } = await params;
  const [page, rawForms] = await Promise.all([
    prisma.landingPage.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, name: true, slug: true } },
      },
    }),
    prisma.form.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, fields: true },
    }),
  ]);
  if (!page) notFound();

  const forms = rawForms.map((f) => ({
    id: f.id,
    name: f.name,
    fieldCount: Array.isArray(f.fields)
      ? (f.fields as unknown as FormField[]).length
      : 0,
  }));

  return (
    <EditClient
      page={{
        id: page.id,
        title: page.title,
        slug: page.slug,
        status: page.status,
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
        ogImageUrl: page.ogImageUrl,
        course: page.course,
      }}
      blocks={parseBlocks(page.blocks)}
      theme={parseTheme(page.theme)}
      forms={forms}
    />
  );
}
