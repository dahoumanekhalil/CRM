"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  createCommunicationSchema,
  type CreateCommunicationInput,
} from "@/lib/schemas/communication";
import { recordActivity } from "@/lib/activity";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session;
}

export async function createCommunication(
  input: CreateCommunicationInput
): Promise<Result<{ id: string }>> {
  const session = await requireSession();
  const parsed = createCommunicationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const emptyToNull = (v: string) => (v.trim() === "" ? null : v);

  try {
    const row = await prisma.communication.create({
      data: {
        type: d.type,
        direction: d.direction,
        subject: emptyToNull(d.subject),
        body: emptyToNull(d.body),
        sentAt: d.sentAt ? new Date(d.sentAt) : null,
        sentById: session.user.id,
        leadId: d.leadId ?? null,
        studentId: d.studentId ?? null,
      },
      select: { id: true },
    });

    // Keep lastContactedAt current when a real interaction is logged.
    if (d.leadId && d.type !== "NOTE") {
      await prisma.lead.update({
        where: { id: d.leadId },
        data: { lastContactedAt: d.sentAt ? new Date(d.sentAt) : new Date() },
      });
    }

    if (d.leadId) revalidatePath(`/leads/${d.leadId}`);
    if (d.studentId) revalidatePath(`/students/${d.studentId}`);

    if (d.leadId) {
      void recordActivity({
        type: "communication.logged",
        entity: "Lead",
        entityId: d.leadId,
        userId: session.user.id,
        meta: {
          communicationType: d.type,
          direction: d.direction,
          subject: d.subject?.trim() || null,
          snippet: d.body?.slice(0, 120) || null,
        },
      });
    }
    if (d.studentId) {
      void recordActivity({
        type: "communication.logged",
        entity: "Student",
        entityId: d.studentId,
        userId: session.user.id,
        meta: {
          communicationType: d.type,
          direction: d.direction,
          subject: d.subject?.trim() || null,
          snippet: d.body?.slice(0, 120) || null,
        },
      });
    }

    return { ok: true, data: { id: row.id } };
  } catch (err) {
    console.error("createCommunication failed", err);
    return { ok: false, error: "Couldn't log the communication. Please try again." };
  }
}

export async function deleteCommunication(id: string): Promise<Result<null>> {
  await requireSession();
  const row = await prisma.communication.findUnique({
    where: { id },
    select: { leadId: true, studentId: true },
  });
  if (!row) return { ok: false, error: "Not found." };

  await prisma.communication.delete({ where: { id } });

  if (row.leadId) revalidatePath(`/leads/${row.leadId}`);
  if (row.studentId) revalidatePath(`/students/${row.studentId}`);

  return { ok: true, data: null };
}

// ------- read helpers used by workspace tabs -------

export async function getCommunicationsForLead(leadId: string) {
  await requireSession();
  return prisma.communication.findMany({
    where: { leadId },
    orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
    include: { sentBy: { select: { name: true, email: true } } },
  });
}
export type LeadCommunicationRow = Awaited<
  ReturnType<typeof getCommunicationsForLead>
>[number];

export async function getCommunicationsForStudent(studentId: string) {
  await requireSession();
  return prisma.communication.findMany({
    where: { studentId },
    orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
    include: { sentBy: { select: { name: true, email: true } } },
  });
}
export type StudentCommunicationRow = Awaited<
  ReturnType<typeof getCommunicationsForStudent>
>[number];
