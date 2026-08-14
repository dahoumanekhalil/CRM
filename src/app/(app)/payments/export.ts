"use server";

import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { buildCsv } from "@/lib/csv";
import type { Prisma } from "@prisma/client";

function serializeAmount(amount: unknown): number {
  if (amount === null || amount === undefined) return 0;
  const n = Number(String(amount));
  return Number.isFinite(n) ? n : 0;
}

export async function exportPaymentsCsv(opts: {
  q?: string;
  status?: string;
  method?: string;
  studentId?: string;
}): Promise<{ ok: true; csv: string; filename: string } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not authenticated" };

  const where: Prisma.PaymentWhereInput = {};
  if (opts.status && opts.status !== "ALL") {
    where.status = opts.status as Prisma.EnumPaymentStatusFilter;
  }
  if (opts.method && opts.method !== "ALL") {
    where.method = opts.method as Prisma.EnumPaymentMethodFilter;
  }
  if (opts.studentId) where.studentId = opts.studentId;
  if (opts.q) {
    const term = opts.q.trim();
    where.OR = [
      { reference: { contains: term, mode: "insensitive" } },
      {
        student: {
          OR: [
            { firstName: { contains: term, mode: "insensitive" } },
            { lastName: { contains: term, mode: "insensitive" } },
            { email: { contains: term, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  const rows = await prisma.payment.findMany({
    where,
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    take: 10_000,
    select: {
      id: true,
      amount: true,
      currency: true,
      method: true,
      status: true,
      reference: true,
      paidAt: true,
      createdAt: true,
      notes: true,
      student: { select: { id: true, firstName: true, lastName: true, email: true } },
      registration: {
        select: {
          session: {
            select: {
              title: true,
              startDate: true,
              course: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  const headers = [
    "ID",
    "Student name",
    "Student email",
    "Amount",
    "Currency",
    "Method",
    "Status",
    "Reference",
    "Course",
    "Session",
    "Session date",
    "Paid at",
    "Notes",
    "Recorded",
  ];

  const data = rows.map((p) => {
    const studentName =
      [p.student.firstName, p.student.lastName].filter(Boolean).join(" ") || "";
    const session = p.registration?.session;
    return [
      p.id,
      studentName,
      p.student.email ?? "",
      serializeAmount(p.amount).toFixed(2),
      p.currency,
      p.method.toLowerCase().replace("_", " "),
      p.status.toLowerCase(),
      p.reference ?? "",
      session?.course.name ?? "",
      session?.title ?? "",
      session?.startDate ? format(session.startDate, "yyyy-MM-dd") : "",
      p.paidAt ? format(p.paidAt, "yyyy-MM-dd HH:mm") : "",
      p.notes ?? "",
      format(p.createdAt, "yyyy-MM-dd HH:mm"),
    ];
  });

  const filename = `payments-${format(new Date(), "yyyy-MM-dd")}.csv`;
  return { ok: true, csv: buildCsv(headers, data), filename };
}
