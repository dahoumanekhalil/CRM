import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseBlocks, parseTheme } from "@/lib/landing-blocks/schemas";
import { PageRenderer } from "@/components/landing-blocks/block-renderer";
import type { LandingBlock } from "@/lib/landing-blocks/types";
import type { FormField, FormSettings } from "@/lib/forms/types";

export const dynamic = "force-dynamic";

async function loadPage(slug: string) {
  return prisma.landingPage.findUnique({
    where: { slug },
    include: {
      course: { select: { name: true, imageUrl: true } },
    },
  });
}

export async function generateMetadata({
  params,
}: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadPage(slug);
  if (!page || page.status !== "PUBLISHED") {
    return { title: "Not found" };
  }
  const title = page.seoTitle || page.title;
  const description = page.seoDescription ?? undefined;
  const image = page.ogImageUrl || page.course?.imageUrl || undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function PublicLandingPage({
  params,
}: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const page = await loadPage(slug);
  if (!page || page.status !== "PUBLISHED") notFound();

  const blocks = parseBlocks(page.blocks);
  const theme = parseTheme(page.theme);

  // Collect all formIds referenced by form blocks and fetch their definitions.
  const formIds = blocks
    .filter((b): b is Extract<LandingBlock, { type: "form" }> => b.type === "form")
    .map((b) => b.props.formId)
    .filter((id): id is string => !!id);

  let formMap: Record<string, { id: string; fields: FormField[]; settings: FormSettings }> = {};

  if (formIds.length > 0) {
    const forms = await prisma.form.findMany({
      where: { id: { in: formIds } },
      select: { id: true, name: true, fields: true, settings: true },
    });
    formMap = Object.fromEntries(
      forms.map((f) => [
        f.id,
        {
          id: f.id,
          name: f.name,
          fields: Array.isArray(f.fields) ? (f.fields as unknown as FormField[]) : [],
          settings: (f.settings ?? {}) as FormSettings,
        },
      ])
    );
  }

  // Inject formDefinition into form blocks that have a formId.
  const enrichedBlocks: LandingBlock[] = blocks.map((block) => {
    if (block.type === "form" && block.props.formId) {
      const def = formMap[block.props.formId];
      if (def) {
        return {
          ...block,
          props: { ...block.props, formDefinition: def },
        } as LandingBlock;
      }
    }
    return block;
  });

  return (
    <PageRenderer
      blocks={enrichedBlocks}
      theme={theme}
      landingPageId={page.id}
      animated
    />
  );
}
