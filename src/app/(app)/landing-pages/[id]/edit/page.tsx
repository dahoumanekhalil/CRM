import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseBlocks, parseTheme } from "@/lib/landing-blocks/schemas";
import { EditClient } from "./edit-client";

export const metadata = { title: "Edit landing page" };

export default async function EditLandingPage({
  params,
}: PageProps<"/landing-pages/[id]/edit">) {
  const { id } = await params;
  const page = await prisma.landingPage.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, name: true, slug: true } },
    },
  });
  if (!page) notFound();

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
    />
  );
}
