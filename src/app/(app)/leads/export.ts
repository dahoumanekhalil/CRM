"use server";

import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { buildCsv } from "@/lib/csv";
import type { Prisma } from "@prisma/client";

export async function exportLeadsCsv(opts: {
  q?: string;
  status?: string;
  courseId?: string;
}): Promise<{ ok: true; csv: string; filename: string } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not authenticated" };

  const where: Prisma.LeadWhereInput = {};
  if (opts.status && opts.status !== "ALL") {
    where.status = opts.status as Prisma.EnumLeadStatusFilter;
  }
  if (opts.courseId) where.courseId = opts.courseId;
  if (opts.q) {
    const term = opts.q.trim();
    where.OR = [
      { firstName: { contains: term, mode: "insensitive" } },
      { lastName: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10_000,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      status: true,
      source: true,
      subscribed: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      tags: true,
      notes: true,
      createdAt: true,
      course: { select: { name: true } },
      campaign: { select: { name: true } },
      student: { select: { id: true } },
    },
  });

  const headers = [
    "ID",
    "First name",
    "Last name",
    "Email",
    "Phone",
    "Status",
    "Source",
    "Course",
    "Campaign",
    "Subscribed",
    "UTM source",
    "UTM medium",
    "UTM campaign",
    "Tags",
    "Notes",
    "Converted",
    "Created",
  ];

  const data = rows.map((r) => [
    r.id,
    r.firstName,
    r.lastName ?? "",
    r.email ?? "",
    r.phone ?? "",
    r.status,
    r.source ?? "",
    r.course?.name ?? "",
    r.campaign?.name ?? "",
    r.subscribed ? "Yes" : "No",
    r.utmSource ?? "",
    r.utmMedium ?? "",
    r.utmCampaign ?? "",
    r.tags.join("; "),
    r.notes ?? "",
    r.student ? "Yes" : "No",
    format(r.createdAt, "yyyy-MM-dd HH:mm"),
  ]);

  const filename = `leads-${format(new Date(), "yyyy-MM-dd")}.csv`;
  return { ok: true, csv: buildCsv(headers, data), filename };
}
