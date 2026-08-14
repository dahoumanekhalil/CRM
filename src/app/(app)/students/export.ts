"use server";

import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { buildCsv } from "@/lib/csv";
import type { Prisma } from "@prisma/client";

export async function exportStudentsCsv(opts: {
  q?: string;
  tag?: string;
}): Promise<{ ok: true; csv: string; filename: string } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not authenticated" };

  const where: Prisma.StudentWhereInput = {};
  if (opts.tag) where.tags = { has: opts.tag };
  if (opts.q) {
    const term = opts.q.trim();
    where.OR = [
      { firstName: { contains: term, mode: "insensitive" } },
      { lastName: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { phone: { contains: term } },
    ];
  }

  const rows = await prisma.student.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10_000,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      dateOfBirth: true,
      address: true,
      tags: true,
      notes: true,
      createdAt: true,
      _count: { select: { registrations: true, payments: true } },
    },
  });

  const headers = [
    "ID",
    "First name",
    "Last name",
    "Email",
    "Phone",
    "Date of birth",
    "Address",
    "Tags",
    "Registrations",
    "Payments",
    "Notes",
    "Created",
  ];

  const data = rows.map((r) => [
    r.id,
    r.firstName,
    r.lastName ?? "",
    r.email ?? "",
    r.phone ?? "",
    r.dateOfBirth ? format(r.dateOfBirth, "yyyy-MM-dd") : "",
    r.address ?? "",
    r.tags.join("; "),
    r._count.registrations,
    r._count.payments,
    r.notes ?? "",
    format(r.createdAt, "yyyy-MM-dd HH:mm"),
  ]);

  const filename = `students-${format(new Date(), "yyyy-MM-dd")}.csv`;
  return { ok: true, csv: buildCsv(headers, data), filename };
}
