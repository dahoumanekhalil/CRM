"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  createLeadSchema,
  listLeadsSchema,
  updateLeadSchema,
  type CreateLeadInput,
  type ListLeadsInput,
  type UpdateLeadInput,
} from "@/lib/schemas/lead";
import {
  convertLeadSchema,
  type ConvertLeadInput,
} from "@/lib/schemas/registration";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  return session;
}

export async function createLead(
  input: CreateLeadInput
): Promise<Result<{ id: string }>> {
  const parsed = createLeadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const session = await requireSession();

  const d = parsed.data;
  const emptyToNull = (v: string) => (v.trim() === "" ? null : v);

  try {
    const created = await prisma.lead.create({
      data: {
        firstName: d.firstName,
        lastName: emptyToNull(d.lastName),
        email: emptyToNull(d.email),
        phone: emptyToNull(d.phone),
        source: emptyToNull(d.source),
        notes: emptyToNull(d.notes),
        status: d.status,
        tags: d.tags,
        ownerId: session.user.id,
      },
      select: { id: true },
    });

    revalidatePath("/leads");
    return { ok: true, data: created };
  } catch (err) {
    console.error("createLead failed", err);
    return { ok: false, error: "We couldn't save the lead. Please try again." };
  }
}

export async function listLeads(input: ListLeadsInput) {
  const parsed = listLeadsSchema.parse(input);
  await requireSession();

  const where: Prisma.LeadWhereInput = {};

  if (parsed.status !== "ALL") {
    where.status = parsed.status;
  }

  if (parsed.courseId) {
    where.courseId = parsed.courseId;
  }

  if (parsed.q) {
    const term = parsed.q.trim();
    where.OR = [
      { firstName: { contains: term, mode: "insensitive" } },
      { lastName: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { phone: { contains: term, mode: "insensitive" } },
      { source: { contains: term, mode: "insensitive" } },
    ];
  }

  const orderBy: Prisma.LeadOrderByWithRelationInput = {
    [parsed.sortBy]: parsed.sortDir,
  };

  const [rows, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy,
      skip: (parsed.page - 1) * parsed.pageSize,
      take: parsed.pageSize,
      include: {
        owner: { select: { id: true, name: true, email: true, image: true } },
        course: { select: { id: true, name: true, slug: true } },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return {
    rows,
    total,
    page: parsed.page,
    pageSize: parsed.pageSize,
  };
}

export type LeadRow = Awaited<ReturnType<typeof listLeads>>["rows"][number];

// Cheap picker for the leads toolbar's course filter dropdown.
export async function listCoursesForLeadFilter() {
  await requireSession();
  return prisma.course.findMany({
    where: { status: { in: ["PUBLISHED", "DRAFT"] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export type LeadCoursePickerItem = Awaited<
  ReturnType<typeof listCoursesForLeadFilter>
>[number];

export async function getLeadDetail(id: string) {
  await requireSession();
  return prisma.lead.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true, image: true } },
      course: { select: { id: true, name: true, slug: true } },
      campaign: { select: { id: true, name: true } },
      student: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

export type LeadDetail = NonNullable<
  Awaited<ReturnType<typeof getLeadDetail>>
>;

// Convert a Lead into a Student — creating a fresh Student record when there's
// no email match, or soft-linking to an existing Student otherwise. Optionally
// registers the new/linked student for a session in the same transaction, in
// which case the lead's status flips to REGISTERED.
export async function convertLead(
  input: ConvertLeadInput
): Promise<
  Result<{ leadId: string; studentId: string; registrationId: string | null; reused: boolean }>
> {
  const parsed = convertLeadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  await requireSession();
  const d = parsed.data;

  const lead = await prisma.lead.findUnique({
    where: { id: d.leadId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      notes: true,
      tags: true,
      studentId: true,
    },
  });
  if (!lead) return { ok: false, error: "Lead not found." };
  if (!lead.firstName) {
    return { ok: false, error: "Lead needs at least a first name to convert." };
  }

  // Look up (or create) the student. Dedupe by email if provided.
  let studentId = lead.studentId;
  let reused = false;

  if (!studentId) {
    if (lead.email) {
      const existing = await prisma.student.findUnique({
        where: { email: lead.email },
        select: { id: true },
      });
      if (existing) {
        studentId = existing.id;
        reused = true;
      }
    }

    if (!studentId) {
      try {
        const created = await prisma.student.create({
          data: {
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
            phone: lead.phone,
            notes: lead.notes,
            tags: lead.tags,
          },
          select: { id: true },
        });
        studentId = created.id;
      } catch (err) {
        console.error("convertLead: student create failed", err);
        return {
          ok: false,
          error: "Couldn't create the student. Please try again.",
        };
      }
    }
  }

  // Optionally register the student for a session in the same step.
  let registrationId: string | null = null;
  if (d.sessionId) {
    // Guard capacity + dedupe by hand (we don't want to import the
    // registrations action here and create a server → server call).
    const session = await prisma.courseSession.findUnique({
      where: { id: d.sessionId },
      select: {
        id: true,
        capacity: true,
        course: { select: { slug: true } },
      },
    });
    if (!session) return { ok: false, error: "Session not found." };

    const clash = await prisma.registration.findUnique({
      where: {
        studentId_sessionId: { studentId, sessionId: d.sessionId },
      },
      select: { id: true },
    });
    if (clash) {
      registrationId = clash.id;
    } else {
      const taken = await prisma.registration.count({
        where: {
          sessionId: d.sessionId,
          status: {
            in: ["PENDING", "CONFIRMED", "ATTENDING", "COMPLETED"],
          },
        },
      });
      if (taken >= session.capacity) {
        return {
          ok: false,
          error: `Session is at capacity (${taken}/${session.capacity}).`,
        };
      }
      const reg = await prisma.registration.create({
        data: {
          studentId,
          sessionId: d.sessionId,
          status: d.registrationStatus,
          source: "Lead conversion",
          notes: d.notes.trim() === "" ? null : d.notes,
          confirmedAt:
            d.registrationStatus === "CONFIRMED" ? new Date() : null,
        },
        select: { id: true },
      });
      registrationId = reg.id;
    }

    // Bump session status → FULL if we just filled it.
    const taken = await prisma.registration.count({
      where: {
        sessionId: d.sessionId,
        status: {
          in: ["PENDING", "CONFIRMED", "ATTENDING", "COMPLETED"],
        },
      },
    });
    if (taken >= session.capacity) {
      await prisma.courseSession.update({
        where: { id: d.sessionId },
        data: { status: "FULL" },
      });
    }

    if (session.course?.slug) {
      revalidatePath(`/courses/${session.course.slug}`);
    }
    revalidatePath("/sessions");
  }

  // Update the lead's link + status. If we registered, mark REGISTERED,
  // otherwise INTERESTED — the "accepted, awaiting session" state.
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      studentId,
      status: registrationId ? "REGISTERED" : "INTERESTED",
    },
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${lead.id}`);
  revalidatePath(`/students/${studentId}`);

  return {
    ok: true,
    data: { leadId: lead.id, studentId, registrationId, reused },
  };
}

export async function bulkUpdateLeadStatus(
  ids: string[],
  status: string
): Promise<Result<{ count: number }>> {
  if (!ids.length) return { ok: false, error: "No leads selected." };
  if (ids.length > 500) return { ok: false, error: "Select at most 500 leads at a time." };
  await requireSession();
  try {
    const result = await prisma.lead.updateMany({
      where: { id: { in: ids } },
      data: { status: status as never },
    });
    revalidatePath("/leads");
    return { ok: true, data: { count: result.count } };
  } catch (err) {
    console.error("bulkUpdateLeadStatus failed", err);
    return { ok: false, error: "Couldn't update the leads. Please try again." };
  }
}

export async function updateLead(
  input: UpdateLeadInput
): Promise<Result<{ id: string }>> {
  const parsed = updateLeadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  await requireSession();
  const d = parsed.data;
  const emptyToNull = (v: string) => (v.trim() === "" ? null : v);

  try {
    await prisma.lead.update({
      where: { id: d.id },
      data: {
        firstName: d.firstName,
        lastName: emptyToNull(d.lastName),
        email: emptyToNull(d.email),
        phone: emptyToNull(d.phone),
        source: emptyToNull(d.source),
        notes: emptyToNull(d.notes),
        status: d.status,
        tags: d.tags,
        subscribed: d.subscribed,
      },
      select: { id: true },
    });
    revalidatePath("/leads");
    revalidatePath(`/leads/${d.id}`);
    return { ok: true, data: { id: d.id } };
  } catch (err) {
    console.error("updateLead failed", err);
    return { ok: false, error: "Couldn't save the lead. Please try again." };
  }
}

export async function deleteLead(id: string): Promise<Result<null>> {
  await requireSession();
  try {
    await prisma.lead.delete({ where: { id } });
    revalidatePath("/leads");
    return { ok: true, data: null };
  } catch (err) {
    console.error("deleteLead failed", err);
    return { ok: false, error: "Couldn't delete the lead. Please try again." };
  }
}
