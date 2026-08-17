"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermissionAction } from "@/lib/auth-guards";
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
import { recordActivity } from "@/lib/activity";
import { NotificationService } from "@/lib/notifications/notification-service";
import { NotificationTypes } from "@/lib/notifications/types";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export async function createLead(
  input: CreateLeadInput
): Promise<Result<{ id: string }>> {
  const parsed = createLeadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const session = await requirePermissionAction("leads.write");

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
        // New leads start unassigned — Sales Manager must assign them explicitly.
        // Exception: if the creator is a SALES rep, assign to themselves directly.
        ownerId: session.user.role === "SALES" ? session.user.id : null,
      },
      select: { id: true },
    });

    void recordActivity({
      type: "lead.created",
      entity: "Lead",
      entityId: created.id,
      userId: session.user.id,
      meta: { source: d.source ?? null },
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
  const session = await requirePermissionAction("leads.view");

  const where: Prisma.LeadWhereInput = {};

  // SALES role: always scoped to their own leads only — no global visibility.
  if (session.user.role === "SALES") {
    where.ownerId = session.user.id;
  } else {
    if (parsed.ownership === "mine") {
      where.ownerId = session.user.id;
    } else if (parsed.ownership === "unassigned") {
      where.ownerId = null;
    }
  }

  if (parsed.status !== "ALL") {
    where.status = parsed.status;
  }

  if (parsed.courseId) {
    where.courseId = parsed.courseId;
  }

  if (parsed.highPriority) {
    where.isHighPriority = true;
  }

  if (parsed.followUp !== "ALL") {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86_400_000 - 1);

    if (parsed.followUp === "needs-followup") {
      where.nextAction = { not: null };
    } else if (parsed.followUp === "overdue") {
      where.nextActionDue = { lt: todayStart };
    } else if (parsed.followUp === "due-today") {
      where.nextActionDue = { gte: todayStart, lte: todayEnd };
    }
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
  await requirePermissionAction("leads.view");
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
  const session = await requirePermissionAction("leads.view");
  // SALES role can only fetch leads assigned to them.
  const where: Prisma.LeadWhereUniqueInput = session.user.role === "SALES"
    ? { id, ownerId: session.user.id }
    : { id };
  return prisma.lead.findUnique({
    where,
    include: {
      owner: { select: { id: true, name: true, email: true, image: true } },
      nextActionOwner: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, name: true, slug: true } },
      campaign: { select: { id: true, name: true } },
      student: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

async function assertLeadWriteAccess(leadId: string, sessionUserId: string, role: string): Promise<Result<null>> {
  if (role === "SALES") {
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { ownerId: true } });
    if (!lead) return { ok: false, error: "Lead not found." };
    if (lead.ownerId !== sessionUserId) return { ok: false, error: "You can only edit your own leads." };
  }
  return { ok: true, data: null };
}

export async function updateLeadNextAction(
  leadId: string,
  data: { nextAction: string; nextActionDue: string | null; nextActionOwnerId: string | null }
): Promise<Result<null>> {
  const session = await requirePermissionAction("leads.write");

  if (!data.nextAction.trim()) {
    return { ok: false, error: "Next action text is required." };
  }

  const access = await assertLeadWriteAccess(leadId, session.user.id, session.user.role ?? "");
  if (!access.ok) return access;

  try {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        nextAction: data.nextAction.trim(),
        nextActionDue: data.nextActionDue ? new Date(data.nextActionDue) : null,
        nextActionOwnerId: data.nextActionOwnerId || null,
      },
    });
    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/leads");
    return { ok: true, data: null };
  } catch (err) {
    console.error("updateLeadNextAction failed", err);
    return { ok: false, error: "We couldn't save the next action. Please try again." };
  }
}

export async function clearLeadNextAction(leadId: string): Promise<Result<null>> {
  const session = await requirePermissionAction("leads.write");
  const access = await assertLeadWriteAccess(leadId, session.user.id, session.user.role ?? "");
  if (!access.ok) return access;

  try {
    await prisma.lead.update({
      where: { id: leadId },
      data: { nextAction: null, nextActionDue: null, nextActionOwnerId: null },
    });
    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/leads");
    return { ok: true, data: null };
  } catch (err) {
    console.error("clearLeadNextAction failed", err);
    return { ok: false, error: "We couldn't clear the next action. Please try again." };
  }
}

export async function toggleLeadPriority(leadId: string): Promise<Result<{ isHighPriority: boolean }>> {
  const session = await requirePermissionAction("leads.write");
  const access = await assertLeadWriteAccess(leadId, session.user.id, session.user.role ?? "");
  if (!access.ok) return { ok: false, error: access.error };
  try {
    const current = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { isHighPriority: true },
    });
    if (!current) return { ok: false, error: "Lead not found." };

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: { isHighPriority: !current.isHighPriority },
      select: { isHighPriority: true },
    });

    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/leads");
    return { ok: true, data: { isHighPriority: updated.isHighPriority } };
  } catch (err) {
    console.error("toggleLeadPriority failed", err);
    return { ok: false, error: "Couldn't update priority. Please try again." };
  }
}

export async function listLeadsUsers() {
  await requirePermissionAction("leads.view");
  return prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
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
  const session = await requirePermissionAction("leads.write");
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
    const courseSession = await prisma.courseSession.findUnique({
      where: { id: d.sessionId },
      select: {
        id: true,
        capacity: true,
        course: { select: { slug: true } },
      },
    });
    if (!courseSession) return { ok: false, error: "Session not found." };

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
      if (taken >= courseSession.capacity) {
        return {
          ok: false,
          error: `Session is at capacity (${taken}/${courseSession.capacity}).`,
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
          salesOwnerId: session.user.id,
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
    if (taken >= courseSession.capacity) {
      await prisma.courseSession.update({
        where: { id: d.sessionId },
        data: { status: "FULL" },
      });
    }

    if (courseSession.course?.slug) {
      revalidatePath(`/courses/${courseSession.course.slug}`);
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

  void recordActivity({
    type: "lead.converted",
    entity: "Lead",
    entityId: lead.id,
    userId: session.user.id,
    meta: { studentId },
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
  const session = await requirePermissionAction("leads.write");
  try {
    // SALES role: can only update leads assigned to them.
    const where: Prisma.LeadWhereInput = session.user.role === "SALES"
      ? { id: { in: ids }, ownerId: session.user.id }
      : { id: { in: ids } };
    const result = await prisma.lead.updateMany({
      where,
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
  const session = await requirePermissionAction("leads.write");
  const d = parsed.data;
  const emptyToNull = (v: string) => (v.trim() === "" ? null : v);

  const access = await assertLeadWriteAccess(d.id, session.user.id, session.user.role ?? "");
  if (!access.ok) return { ok: false, error: access.error };

  const oldLead = await prisma.lead.findUnique({
    where: { id: d.id },
    select: { status: true, ownerId: true },
  });

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

    void recordActivity({
      type: "lead.updated",
      entity: "Lead",
      entityId: d.id,
      userId: session.user.id,
    });
    if (oldLead && d.status && d.status !== oldLead.status) {
      void recordActivity({
        type: "lead.status_changed",
        entity: "Lead",
        entityId: d.id,
        userId: session.user.id,
        meta: { from: oldLead.status, to: d.status },
      });
    }

    revalidatePath("/leads");
    revalidatePath(`/leads/${d.id}`);
    return { ok: true, data: { id: d.id } };
  } catch (err) {
    console.error("updateLead failed", err);
    return { ok: false, error: "Couldn't save the lead. Please try again." };
  }
}

export async function deleteLead(id: string): Promise<Result<null>> {
  // Deletion is restricted to managers/admins — SALES reps cannot delete leads.
  await requirePermissionAction("leads.assign");
  try {
    await prisma.lead.delete({ where: { id } });
    revalidatePath("/leads");
    return { ok: true, data: null };
  } catch (err) {
    console.error("deleteLead failed", err);
    return { ok: false, error: "Couldn't delete the lead. Please try again." };
  }
}

export async function updateLeadOwner(
  leadId: string,
  newOwnerId: string | null,
  note?: string,
): Promise<Result<null>> {
  // Only ADMIN/MANAGER can assign leads — enforced server-side.
  const session = await requirePermissionAction("leads.assign");

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      ownerId: true,
      firstName: true,
      lastName: true,
      courseId: true,
      course: { select: { name: true } },
    },
  });
  if (!lead) return { ok: false, error: "Lead not found." };

  let targetUser: { id: string; role: string; name: string | null } | null = null;
  if (newOwnerId) {
    targetUser = await prisma.user.findUnique({
      where: { id: newOwnerId },
      select: { id: true, role: true, name: true },
    });
    if (!targetUser) return { ok: false, error: "Assignee not found." };
  }

  const now = new Date();

  try {
    await prisma.$transaction([
      prisma.lead.update({
        where: { id: leadId },
        data: {
          ownerId: newOwnerId,
          assignedById: newOwnerId ? session.user.id : null,
          assignedAt: newOwnerId ? now : null,
        },
        select: { id: true },
      }),
      prisma.leadAssignment.create({
        data: {
          leadId,
          assignedToId: newOwnerId ?? undefined,
          assignedById: session.user.id,
          note: note?.trim() || null,
        },
      }),
    ]);

    void recordActivity({
      type: "lead.assigned",
      entity: "Lead",
      entityId: leadId,
      userId: session.user.id,
      meta: { from: lead.ownerId, to: newOwnerId, toName: targetUser?.name ?? null },
    });

    // Notify the new owner if they differ from the assigner.
    if (newOwnerId && newOwnerId !== session.user.id) {
      const leadName = [lead.firstName, lead.lastName].filter(Boolean).join(" ");
      NotificationService.send({
        recipientId: newOwnerId,
        type: NotificationTypes.LEAD_ASSIGNED,
        entityType: "Lead",
        entityId: leadId,
        payload: {
          title: "New lead assigned to you",
          body: leadName,
          leadName,
          leadId,
          courseName: lead.course?.name ?? null,
        },
      });
    }

    revalidatePath("/leads");
    revalidatePath(`/leads/${leadId}`);
    return { ok: true, data: null };
  } catch (err) {
    console.error("updateLeadOwner failed", err);
    return { ok: false, error: "Couldn't reassign the lead. Please try again." };
  }
}

export async function updateLeadNotes(
  leadId: string,
  notes: string
): Promise<Result<null>> {
  const session = await requirePermissionAction("leads.write");
  const access = await assertLeadWriteAccess(leadId, session.user.id, session.user.role ?? "");
  if (!access.ok) return access;
  const trimmed = notes.trim();
  try {
    await prisma.lead.update({
      where: { id: leadId },
      data: { notes: trimmed === "" || trimmed === "<p></p>" ? null : trimmed },
      select: { id: true },
    });
    revalidatePath(`/leads/${leadId}`);
    return { ok: true, data: null };
  } catch (err) {
    console.error("updateLeadNotes failed", err);
    return { ok: false, error: "Couldn't save the notes. Please try again." };
  }
}

// ── Sales Team ────────────────────────────────────────────────────────────────

// Picker: users who can receive lead assignments (SALES + MANAGER + ADMIN).
export async function listSalesTeam() {
  await requirePermissionAction("leads.assign");
  return prisma.user.findMany({
    where: { role: { in: ["ADMIN", "MANAGER", "SALES"] } },
    select: { id: true, name: true, email: true, role: true, image: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}

export type SalesTeamMember = Awaited<ReturnType<typeof listSalesTeam>>[number];

// Full team workload summary for the manager dashboard.
export async function getSalesTeamWorkload() {
  await requirePermissionAction("leads.assign");

  const reps = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "MANAGER", "SALES"] } },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });

  const stats = await Promise.all(
    reps.map(async (rep) => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const [assigned, pendingFollowUp, registered] = await Promise.all([
        prisma.lead.count({ where: { ownerId: rep.id, status: { notIn: ["LOST", "REGISTERED"] } } }),
        prisma.lead.count({ where: { ownerId: rep.id, nextActionDue: { lt: now, gte: todayStart } } }),
        prisma.lead.count({ where: { ownerId: rep.id, status: "REGISTERED" } }),
      ]);
      return { ...rep, assigned, pendingFollowUp, registered };
    })
  );

  return stats;
}

export type SalesTeamWorkloadRow = Awaited<ReturnType<typeof getSalesTeamWorkload>>[number];

// ── Bulk assignment ────────────────────────────────────────────────────────────

export async function bulkAssignLeads(
  leadIds: string[],
  assigneeId: string,
  note?: string,
): Promise<Result<{ assigned: number }>> {
  if (!leadIds.length) return { ok: false, error: "No leads selected." };
  if (leadIds.length > 200) return { ok: false, error: "Select at most 200 leads at a time." };

  const session = await requirePermissionAction("leads.assign");

  // Validate the assignee.
  const assignee = await prisma.user.findUnique({
    where: { id: assigneeId },
    select: { id: true, role: true, name: true },
  });
  if (!assignee) return { ok: false, error: "Assignee not found." };

  const now = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.lead.updateMany({
        where: { id: { in: leadIds } },
        data: { ownerId: assigneeId, assignedById: session.user.id, assignedAt: now },
      });
      await tx.leadAssignment.createMany({
        data: leadIds.map((leadId) => ({
          leadId,
          assignedToId: assigneeId,
          assignedById: session.user.id,
          note: note?.trim() || null,
        })),
      });
    });

    void (async () => {
      for (const leadId of leadIds) {
        void recordActivity({
          type: "lead.assigned",
          entity: "Lead",
          entityId: leadId,
          userId: session.user.id,
          meta: { to: assigneeId, toName: assignee.name, bulk: true },
        });
      }
    })();

    // Send a single grouped notification to the assignee.
    if (assigneeId !== session.user.id) {
      NotificationService.send({
        recipientId: assigneeId,
        type: NotificationTypes.LEAD_ASSIGNED,
        entityType: "Lead",
        entityId: leadIds[0]!,
        payload: {
          title: `${leadIds.length} new lead${leadIds.length > 1 ? "s" : ""} assigned to you`,
          body: `You have ${leadIds.length} new lead${leadIds.length > 1 ? "s" : ""} to follow up.`,
          leadCount: leadIds.length,
          leadId: leadIds[0]!,
          courseName: null,
          leadName: null,
        },
      });
    }

    revalidatePath("/leads");
    return { ok: true, data: { assigned: leadIds.length } };
  } catch (err) {
    console.error("bulkAssignLeads failed", err);
    return { ok: false, error: "Couldn't assign the leads. Please try again." };
  }
}

// Assignment history for a single lead.
export async function getLeadAssignmentHistory(leadId: string) {
  await requirePermissionAction("leads.view");
  return prisma.leadAssignment.findMany({
    where: { leadId },
    orderBy: { createdAt: "desc" },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      assignedBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export type LeadAssignmentHistoryRow = Awaited<
  ReturnType<typeof getLeadAssignmentHistory>
>[number];

// Unassigned leads inbox for the Sales Manager.
export async function listUnassignedLeads(options?: { courseId?: string; q?: string }) {
  await requirePermissionAction("leads.assign");

  const where: Prisma.LeadWhereInput = { ownerId: null };
  if (options?.courseId) where.courseId = options.courseId;
  if (options?.q) {
    const term = options.q.trim();
    where.OR = [
      { firstName: { contains: term, mode: "insensitive" } },
      { lastName: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { phone: { contains: term, mode: "insensitive" } },
    ];
  }

  return prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      course: { select: { id: true, name: true } },
    },
  });
}

export type UnassignedLeadRow = Awaited<ReturnType<typeof listUnassignedLeads>>[number];

// Sales manager KPI summary.
export async function getSalesManagerKpis() {
  await requirePermissionAction("leads.assign");
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86_400_000 - 1);

  const [
    totalLeads, unassigned, assigned,
    followUpsToday, overdueFollowUps, registered,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { ownerId: null } }),
    prisma.lead.count({ where: { ownerId: { not: null } } }),
    prisma.lead.count({ where: { nextActionDue: { gte: todayStart, lte: todayEnd } } }),
    prisma.lead.count({ where: { nextActionDue: { lt: todayStart }, status: { notIn: ["LOST", "REGISTERED"] } } }),
    prisma.lead.count({ where: { status: "REGISTERED" } }),
  ]);

  return { totalLeads, unassigned, assigned, followUpsToday, overdueFollowUps, registered };
}

export type SalesManagerKpis = Awaited<ReturnType<typeof getSalesManagerKpis>>;
