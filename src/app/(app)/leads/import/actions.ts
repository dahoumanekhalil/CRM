"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermissionAction } from "@/lib/auth-guards";
import { normalizeEmail, normalizePhone } from "@/lib/string-utils";

export interface ImportLeadRow {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  notes?: string;
  source?: string;
  tags?: string[];
}

export interface ImportOptions {
  courseId?: string;
  source?: string;
  status?: "NEW" | "CONTACTED" | "INTERESTED";
}

export interface ImportResult {
  created: number;
  skipped: number;
  errors: number;
}

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export async function importLeads(
  rows: ImportLeadRow[],
  options: ImportOptions
): Promise<Result<ImportResult>> {
  try {
    await requirePermissionAction("leads.write");

    const result: ImportResult = { created: 0, skipped: 0, errors: 0 };

    const emailsToCheck = rows
      .map((r) => r.email)
      .filter((e): e is string => !!e)
      .map((e) => normalizeEmail(e))
      .filter(Boolean) as string[];

    const existingEmails = new Set<string>();
    if (emailsToCheck.length > 0) {
      const existing = await prisma.lead.findMany({
        where: { email: { in: emailsToCheck } },
        select: { email: true },
      });
      for (const r of existing) {
        if (r.email) existingEmails.add(r.email);
      }
    }

    const toCreate = rows.filter((row) => {
      if (!row.firstName?.trim()) { result.errors++; return false; }
      const norm = row.email ? normalizeEmail(row.email) : null;
      if (norm && existingEmails.has(norm)) { result.skipped++; return false; }
      return true;
    });

    if (toCreate.length > 0) {
      await prisma.lead.createMany({
        data: toCreate.map((row) => ({
          firstName: row.firstName.trim(),
          lastName: row.lastName?.trim() || null,
          email: row.email ? (normalizeEmail(row.email) || null) : null,
          phone: row.phone ? (normalizePhone(row.phone) || null) : null,
          notes: row.notes?.trim() || null,
          source: options.source?.trim() || row.source?.trim() || null,
          tags: row.tags ?? [],
          status: options.status ?? "NEW",
          courseId: options.courseId || null,
        })),
      });
      result.created = toCreate.length;
    }

    revalidatePath("/leads");
    return { ok: true, data: result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Import failed" };
  }
}

export async function getCoursesForImport() {
  await requirePermissionAction("leads.view");
  return prisma.course.findMany({
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });
}
