"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session;
}

export interface ListCustomersInput {
  q?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "name" | "lastPaymentAt" | "paymentsCount";
  sortDir?: "asc" | "desc";
}

export interface CustomerRow {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  totalPaid: { currency: string; amount: number }[];
  paymentsCount: number;
  registrationsCount: number;
  lastPaymentAt: Date | null;
}

export async function listCustomers(input: ListCustomersInput = {}) {
  await requireSession();

  const q = input.q?.trim() ?? "";
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(200, Math.max(5, input.pageSize ?? 25));
  const sortBy = input.sortBy ?? "lastPaymentAt";
  const sortDir = input.sortDir ?? "desc";

  const where = {
    payments: { some: {} },
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" as const } },
            { lastName: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q } },
          ],
        }
      : {}),
  };

  const students = await prisma.student.findMany({
    where,
    include: {
      payments: {
        select: { amount: true, currency: true, status: true, paidAt: true },
      },
      registrations: { select: { id: true } },
    },
  });

  const rows: CustomerRow[] = students.map((s) => {
    const completedByCurrency: Record<string, number> = {};
    let lastPaymentAt: Date | null = null;

    for (const p of s.payments) {
      const amt = Number(p.amount);
      if (p.status === "COMPLETED") {
        completedByCurrency[p.currency] =
          (completedByCurrency[p.currency] ?? 0) + amt;
      }
      if (p.paidAt && (!lastPaymentAt || p.paidAt > lastPaymentAt)) {
        lastPaymentAt = p.paidAt;
      }
    }

    const totalPaid = Object.entries(completedByCurrency).map(
      ([currency, amount]) => ({ currency, amount })
    );

    return {
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      phone: s.phone,
      totalPaid,
      paymentsCount: s.payments.length,
      registrationsCount: s.registrations.length,
      lastPaymentAt,
    };
  });

  rows.sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortBy === "name") {
      const na = `${a.firstName} ${a.lastName ?? ""}`.toLowerCase();
      const nb = `${b.firstName} ${b.lastName ?? ""}`.toLowerCase();
      return na < nb ? -dir : na > nb ? dir : 0;
    }
    if (sortBy === "paymentsCount") {
      return (a.paymentsCount - b.paymentsCount) * dir;
    }
    const da = a.lastPaymentAt?.getTime() ?? 0;
    const db = b.lastPaymentAt?.getTime() ?? 0;
    return (da - db) * dir;
  });

  const total = rows.length;
  const slice = rows.slice((page - 1) * pageSize, page * pageSize);

  return { rows: slice, total, page, pageSize };
}

export type CustomersResult = Awaited<ReturnType<typeof listCustomers>>;
