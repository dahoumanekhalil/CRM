"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermissionAction } from "@/lib/auth-guards";
import { slugify } from "@/lib/slug";
import {
  buildFromTemplate,
  getTemplate,
  type TemplateCourseContext,
} from "@/lib/landing-blocks/templates";
import {
  createLandingPageSchema,
  listLandingPagesSchema,
  updateLandingPageContentSchema,
  updateLandingPageSettingsSchema,
  type CreateLandingPageInput,
  type ListLandingPagesInput,
  type UpdateLandingPageContentInput,
  type UpdateLandingPageSettingsInput,
} from "@/lib/schemas/landing-page";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session;
}

async function uniqueSlug(base: string): Promise<string> {
  const cleaned = slugify(base) || "page";
  let candidate = cleaned;
  let n = 2;
  while (
    await prisma.landingPage.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
  ) {
    candidate = `${cleaned}-${n}`;
    n += 1;
  }
  return candidate;
}

export async function createLandingPage(
  input: CreateLandingPageInput
): Promise<Result<{ id: string; slug: string }>> {
  const parsed = createLandingPageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { courseId, templateId, title: customTitle } = parsed.data;
  const session = await requirePermissionAction("landing-pages.write");

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      name: true,
      summary: true,
      description: true,
      basePrice: true,
      currency: true,
      durationHours: true,
      imageUrl: true,
      category: true,
      level: true,
    },
  });
  if (!course) return { ok: false, error: "Course not found." };

  const template = getTemplate(templateId);
  if (!template) return { ok: false, error: "Template not found." };

  const ctx: TemplateCourseContext = {
    name: course.name,
    summary: course.summary,
    description: course.description,
    basePrice: course.basePrice?.toString(),
    currency: course.currency,
    durationHours: course.durationHours,
    imageUrl: course.imageUrl,
    category: course.category,
    level: course.level,
  };

  const content = buildFromTemplate(templateId, ctx);
  const title = customTitle ?? course.name;
  const slug = await uniqueSlug(title);

  const created = await prisma.landingPage.create({
    data: {
      courseId: course.id,
      title,
      slug,
      status: "DRAFT",
      blocks: content.blocks as unknown as Prisma.InputJsonValue,
      theme: content.theme as unknown as Prisma.InputJsonValue,
      seoTitle: title,
      seoDescription: course.summary ?? undefined,
      createdById: session.user.id,
    },
    select: { id: true, slug: true },
  });

  revalidatePath("/landing-pages");
  return { ok: true, data: created };
}

export async function createLandingPageAndRedirect(
  input: CreateLandingPageInput
) {
  const res = await createLandingPage(input);
  if (!res.ok) return res;
  redirect(`/landing-pages/${res.data.id}/edit`);
}

export async function listLandingPages(input: ListLandingPagesInput) {
  const parsed = listLandingPagesSchema.parse(input);
  await requirePermissionAction("landing-pages.view");

  const where: Prisma.LandingPageWhereInput = {};
  if (parsed.status !== "ALL") where.status = parsed.status;
  if (parsed.q) {
    const term = parsed.q.trim();
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { slug: { contains: term, mode: "insensitive" } },
      { course: { name: { contains: term, mode: "insensitive" } } },
    ];
  }

  const orderBy: Prisma.LandingPageOrderByWithRelationInput = {
    [parsed.sortBy]: parsed.sortDir,
  };

  const [rows, total] = await Promise.all([
    prisma.landingPage.findMany({
      where,
      orderBy,
      skip: (parsed.page - 1) * parsed.pageSize,
      take: parsed.pageSize,
      include: {
        course: { select: { id: true, name: true, slug: true } },
      },
    }),
    prisma.landingPage.count({ where }),
  ]);

  return { rows, total, page: parsed.page, pageSize: parsed.pageSize };
}

export type LandingPageRow = Awaited<
  ReturnType<typeof listLandingPages>
>["rows"][number];

export async function updateLandingPageSettings(
  input: UpdateLandingPageSettingsInput
): Promise<Result<{ id: string; slug: string }>> {
  const parsed = updateLandingPageSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  await requirePermissionAction("landing-pages.write");
  const { id, slug, ...rest } = parsed.data;

  const existing = await prisma.landingPage.findUnique({
    where: { id },
    select: { id: true, slug: true },
  });
  if (!existing) return { ok: false, error: "Page not found." };

  // If the slug changed, ensure it's still unique.
  let finalSlug = slug;
  if (slug !== existing.slug) {
    const clash = await prisma.landingPage.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (clash) return { ok: false, error: "That URL is already taken." };
    finalSlug = slug;
  }

  const updated = await prisma.landingPage.update({
    where: { id },
    data: {
      title: rest.title,
      slug: finalSlug,
      seoTitle: rest.seoTitle || null,
      seoDescription: rest.seoDescription || null,
      ogImageUrl: rest.ogImageUrl || null,
    },
    select: { id: true, slug: true },
  });

  revalidatePath("/landing-pages");
  revalidatePath(`/landing-pages/${id}/edit`);
  revalidatePath(`/p/${updated.slug}`);
  return { ok: true, data: updated };
}

export async function updateLandingPageContent(
  input: UpdateLandingPageContentInput
): Promise<Result<{ id: string; savedAt: string }>> {
  const parsed = updateLandingPageContentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid content",
    };
  }
  await requirePermissionAction("landing-pages.write");
  const { id, blocks, theme } = parsed.data;

  const existing = await prisma.landingPage.findUnique({
    where: { id },
    select: { id: true, slug: true },
  });
  if (!existing) return { ok: false, error: "Page not found." };

  const updated = await prisma.landingPage.update({
    where: { id },
    data: {
      blocks: blocks as unknown as Prisma.InputJsonValue,
      theme: theme as unknown as Prisma.InputJsonValue,
    },
    select: { id: true, updatedAt: true, slug: true },
  });

  revalidatePath(`/p/${updated.slug}`);
  return {
    ok: true,
    data: { id: updated.id, savedAt: updated.updatedAt.toISOString() },
  };
}

export async function setLandingPageStatus(
  id: string,
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
): Promise<Result<{ id: string }>> {
  await requirePermissionAction("landing-pages.write");
  const updated = await prisma.landingPage.update({
    where: { id },
    data: {
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
    },
    select: { id: true, slug: true },
  });
  revalidatePath("/landing-pages");
  revalidatePath(`/landing-pages/${id}/edit`);
  revalidatePath(`/p/${updated.slug}`);
  return { ok: true, data: updated };
}

export async function deleteLandingPage(id: string): Promise<Result<null>> {
  await requirePermissionAction("landing-pages.write");
  const existing = await prisma.landingPage.findUnique({
    where: { id },
    select: { slug: true },
  });
  await prisma.landingPage.delete({ where: { id } });
  revalidatePath("/landing-pages");
  if (existing?.slug) revalidatePath(`/p/${existing.slug}`);
  return { ok: true, data: null };
}
