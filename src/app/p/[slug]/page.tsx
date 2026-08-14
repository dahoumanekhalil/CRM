import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseBlocks, parseTheme } from "@/lib/landing-blocks/schemas";
import { PageRenderer } from "@/components/landing-blocks/block-renderer";

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

  return <PageRenderer blocks={blocks} theme={theme} landingPageId={page.id} />;
}
