"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { FormField, FormSettings } from "@/lib/forms/types";

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session;
}

export async function listForms() {
  await requireSession();
  return prisma.form.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { submissions: true } } },
  });
}

export async function getForm(id: string) {
  await requireSession();
  return prisma.form.findUnique({
    where: { id },
    include: {
      _count: { select: { submissions: true } },
      submissions: { orderBy: { createdAt: "desc" }, take: 200 },
    },
  });
}

export async function createForm(data: {
  name: string;
  description?: string;
  fields: FormField[];
  settings: FormSettings;
}) {
  const session = await requireSession();
  const form = await prisma.form.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      fields: data.fields as object[],
      settings: data.settings as object,
      createdById: session.user.id,
    },
  });
  revalidatePath("/landing-pages/forms");
  return form;
}

export async function updateForm(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    fields?: FormField[];
    settings?: FormSettings;
  }
) {
  await requireSession();
  const form = await prisma.form.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.fields !== undefined ? { fields: data.fields as object[] } : {}),
      ...(data.settings !== undefined ? { settings: data.settings as object } : {}),
    },
  });
  revalidatePath("/landing-pages/forms");
  revalidatePath(`/landing-pages/forms/${id}`);
  revalidatePath(`/landing-pages/forms/${id}/edit`);
  return form;
}

export async function deleteForm(id: string) {
  await requireSession();
  await prisma.form.delete({ where: { id } });
  revalidatePath("/landing-pages/forms");
  redirect("/landing-pages/forms");
}

export async function createAndRedirect(formData: FormData) {
  const session = await requireSession();
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const description = (formData.get("description") as string | null)?.trim() || null;
  if (!name) throw new Error("Name is required");

  const form = await prisma.form.create({
    data: {
      name,
      description,
      fields: [],
      settings: {
        heading: name,
        submitLabel: "Submit",
        successHeading: "Thanks!",
        successMessage: "We received your submission.",
      },
      createdById: session.user.id,
    },
  });
  revalidatePath("/landing-pages/forms");
  redirect(`/landing-pages/forms/${form.id}/edit`);
}

// Returns a lightweight list suitable for inspector dropdowns.
export async function listFormsForPicker() {
  await requireSession();
  return prisma.form.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, fields: true },
  });
}
