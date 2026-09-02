"use server";

import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermissionAction } from "@/lib/auth-guards";
import {
  createLeadSchema,
  listLeadsSchema,
  updateLeadSchema,
  LEAD_CALL_TIME_MATCHERS,
  type CreateLeadInput,
  type ListLeadsInput,
  type UpdateLeadInput,
} from "@/lib/schemas/lead";
import {
  convertLeadSchema,
  type ConvertLeadInput,
} from "@/lib/schemas/registration";
import { recordActivity, getActivitiesForEntity, type ActivityRow } from "@/lib/activity";
import { NotificationService } from "@/lib/notifications/notification-service";
import { NotificationTypes } from "@/lib/notifications/types";
import { normalizeEmail, normalizePhone } from "@/lib/string-utils";
import { cityToWilayaNumber } from "@/lib/wilayas";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

// After a registration is created, check capacity thresholds and fire alerts.
// Thresholds: 80% and 90%. Deduplication is handled by the in-app provider
// and the entityId pattern (sessionId:threshold).
async function fireCourseRunCapacityAlerts(
  sessionId: string,
  taken: number,
  capacity: number,
  courseName: string,
  courseSlug: string,
): Promise<void> {
  if (capacity <= 0) return;
  const pct = (taken / capacity) * 100;

  const managers = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "MANAGER"] } },
    select: { id: true },
  });

  if (taken >= capacity) {
    for (const m of managers) {
      NotificationService.send({
        recipientId: m.id,
        type: NotificationTypes.COURSE_RUN_CAPACITY_REACHED,
        priority: "CRITICAL",
        entityType: "Session",
        entityId: `${sessionId}:full`,
        payload: {
          title: "Course Run Full",
          body: `${courseName} — ${capacity}/${capacity} seats filled`,
          courseName,
          courseSlug,
          filled: capacity,
          capacity,
        },
      });
    }
    return;
  }

  if (pct >= 90) {
    for (const m of managers) {
      NotificationService.send({
        recipientId: m.id,
        type: NotificationTypes.COURSE_RUN_NEAR_CAPACITY,
        priority: "HIGH",
        entityType: "Session",
        entityId: `${sessionId}:90`,
        payload: {
          title: "Course Run Near Capacity",
          body: `${courseName} — ${taken}/${capacity} seats filled`,
          courseName,
          courseSlug,
          filled: taken,
          capacity,
        },
      });
    }
  } else if (pct >= 80) {
    for (const m of managers) {
      NotificationService.send({
        recipientId: m.id,
        type: NotificationTypes.COURSE_RUN_NEAR_CAPACITY,
        priority: "NORMAL",
        entityType: "Session",
        entityId: `${sessionId}:80`,
        payload: {
          title: "Course Run Near Capacity",
          body: `${courseName} — ${taken}/${capacity} seats filled`,
          courseName,
          courseSlug,
          filled: taken,
          capacity,
        },
      });
    }
  }
}

export type PotentialDuplicate = {
  type: "lead" | "student";
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  matchedOn: "email" | "phone";
};

// Advisory-only duplicate detection — never blocks creation.
export async function findPotentialDuplicates(
  email: string | null,
  phone: string | null
): Promise<PotentialDuplicate[]> {
  const normEmail = normalizeEmail(email);
  const normPhone = normalizePhone(phone);
  if (!normEmail && !normPhone) return [];

  const results: PotentialDuplicate[] = [];

  // Email matches — high confidence
  if (normEmail) {
    const [matchedLeads, matchedStudents] = await Promise.all([
      prisma.lead.findMany({
        where: { email: { equals: normEmail, mode: "insensitive" } },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        take: 3,
        orderBy: { createdAt: "desc" },
      }),
      prisma.student.findMany({
        where: { email: { equals: normEmail, mode: "insensitive" } },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        take: 3,
        orderBy: { createdAt: "desc" },
      }),
    ]);
    for (const l of matchedLeads) {
      results.push({
        type: "lead",
        id: l.id,
        name: [l.firstName, l.lastName].filter(Boolean).join(" "),
        email: l.email,
        phone: l.phone,
        matchedOn: "email",
      });
    }
    for (const s of matchedStudents) {
      results.push({
        type: "student",
        id: s.id,
        name: [s.firstName, s.lastName].filter(Boolean).join(" "),
        email: s.email,
        phone: s.phone,
        matchedOn: "email",
      });
    }
  }

  // Phone matches — secondary signal (only if email didn't already match these)
  if (normPhone) {
    const seenLeadIds = new Set(results.filter(r => r.type === "lead").map(r => r.id));
    const seenStudentIds = new Set(results.filter(r => r.type === "student").map(r => r.id));

    const [phoneLeads, phoneStudents] = await Promise.all([
      prisma.lead.findMany({
        where: { phone: { contains: normPhone } },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        take: 3,
        orderBy: { createdAt: "desc" },
      }),
      prisma.student.findMany({
        where: { phone: { contains: normPhone } },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        take: 3,
        orderBy: { createdAt: "desc" },
      }),
    ]);
    for (const l of phoneLeads) {
      if (!seenLeadIds.has(l.id)) {
        results.push({
          type: "lead",
          id: l.id,
          name: [l.firstName, l.lastName].filter(Boolean).join(" "),
          email: l.email,
          phone: l.phone,
          matchedOn: "phone",
        });
      }
    }
    for (const s of phoneStudents) {
      if (!seenStudentIds.has(s.id)) {
        results.push({
          type: "student",
          id: s.id,
          name: [s.firstName, s.lastName].filter(Boolean).join(" "),
          email: s.email,
          phone: s.phone,
          matchedOn: "phone",
        });
      }
    }
  }

  return results.slice(0, 5);
}

export async function createLead(
  input: CreateLeadInput
): Promise<Result<{ id: string; duplicates: PotentialDuplicate[] }>> {
  const parsed = createLeadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const session = await requirePermissionAction("leads.write");

  const d = parsed.data;
  const emptyToNull = (v: string) => (v.trim() === "" ? null : v);
  const email = normalizeEmail(d.email) ?? emptyToNull(d.email);
  const phone = emptyToNull(d.phone);

  try {
    const created = await prisma.lead.create({
      data: {
        firstName: d.firstName,
        lastName: emptyToNull(d.lastName),
        email,
        phone,
        // city / preferredCallTime are typed `as never` because they were added
        // by migrations after the last committed `prisma generate` — the actual
        // DB column exists, the generated client just doesn't know about them.
        city: emptyToNull(d.city ?? "") as never,
        preferredCallTime: emptyToNull(d.preferredCallTime ?? "") as never,
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

    // Advisory duplicate check — never blocks creation.
    // Excludes the record we just created so it doesn't match itself.
    const allDupes = await findPotentialDuplicates(email, phone);
    const duplicates = allDupes.filter(
      (d) => !(d.type === "lead" && d.id === created.id)
    );

    return { ok: true, data: { id: created.id, duplicates } };
  } catch (err) {
    console.error("createLead failed", err);
    return { ok: false, error: "We couldn't save the lead. Please try again." };
  }
}

export async function listLeads(
  input: ListLeadsInput,
  serverOptions?: { contactedOnly?: boolean }
) {
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

  if (parsed.city && parsed.city.trim()) {
    // `city` was added by a post-generate migration; the client type doesn't
    // know about it yet. Runtime accepts it — Prisma just forwards the filter.
    (where as unknown as { city: unknown }).city = {
      contains: parsed.city.trim(),
      mode: "insensitive",
    };
  }

  if (parsed.callTime !== "ALL") {
    // Free-text `preferredCallTime` can be anything ("morning", "AM", "before
    // noon", "صباح"…). Match any synonym for the preset. Wrapped in AND so
    // it composes with `q` (which uses top-level OR) rather than collapsing
    // into a single OR that mixes name-search and call-time matches.
    const matchers = LEAD_CALL_TIME_MATCHERS[parsed.callTime];
    where.AND = [
      ...((where.AND as Prisma.LeadWhereInput[]) ?? []),
      {
        OR: matchers.map((m) => ({
          preferredCallTime: { contains: m, mode: "insensitive" as const },
        })),
      },
    ];
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

  if (serverOptions?.contactedOnly) {
    where.lastContactedAt = { not: null };
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

  // Map the API sortBy key to a Prisma field. `firstName` is the accessor for
  // the Lead column (which shows full name), `callTime` maps to preferredCallTime.
  // `city` is sorted alphabetically at the DB level, then re-ordered in-memory
  // by wilaya number below so the visible page matches Algeria's admin order.
  const sortField: keyof Prisma.LeadOrderByWithRelationInput =
    parsed.sortBy === "callTime" ? "preferredCallTime"
    : parsed.sortBy === "city" ? "city"
    : parsed.sortBy;
  const orderBy: Prisma.LeadOrderByWithRelationInput = {
    [sortField]: parsed.sortDir,
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
        communications: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { body: true, type: true, createdAt: true },
        },
        student: {
          select: {
            registrations: {
              select: {
                agreedPrice: true,
                payments: {
                  where: { status: "COMPLETED" },
                  select: { amount: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  // Wilaya re-sort — applied over the returned page. Cities we can't map to a
  // wilaya (foreign leads, typos) fall to the end but keep their alphabetical
  // order relative to each other. Best-effort within a page — good enough for
  // the common case where pageSize covers the whole pipeline.
  if (parsed.sortBy === "city") {
    const dir = parsed.sortDir === "asc" ? 1 : -1;
    const withWilaya = rows.map((r) => ({
      row: r,
      w: cityToWilayaNumber(
        (r as unknown as { city: string | null }).city,
      ),
    }));
    withWilaya.sort((a, b) => {
      const aw = a.w;
      const bw = b.w;
      if (aw !== null && bw !== null) return (aw - bw) * dir;
      if (aw !== null) return -1;
      if (bw !== null) return 1;
      return 0; // both unknown — DB alphabetical order preserved
    });
    rows.splice(0, rows.length, ...withWilaya.map((x) => x.row));
  }

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
      interestedSession: {
        select: {
          id: true,
          title: true,
          startDate: true,
          endDate: true,
          location: true,
          city: true,
          capacity: true,
          status: true,
          course: { select: { id: true, name: true, slug: true } },
        },
      },
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

    // Upsert a Task so the follow-up appears in /tasks alongside all other work.
    const existingTask = await prisma.task.findFirst({
      where: {
        entityType: "Lead",
        entityId: leadId,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    const taskPayload = {
      title: data.nextAction.trim(),
      dueDate: data.nextActionDue ? new Date(data.nextActionDue) : null,
      ownerId: data.nextActionOwnerId || session.user.id,
    };
    if (existingTask) {
      await prisma.task.update({ where: { id: existingTask.id }, data: taskPayload });
    } else {
      await prisma.task.create({
        data: {
          ...taskPayload,
          status: "TODO",
          priority: "NORMAL",
          entityType: "Lead",
          entityId: leadId,
        },
      });
    }

    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/leads");
    revalidatePath("/tasks");
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
    const normEmail = normalizeEmail(lead.email);
    if (normEmail) {
      const existing = await prisma.student.findUnique({
        where: { email: normEmail },
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
            email: normalizeEmail(lead.email),
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
    const sessionId = d.sessionId; // narrow to string for use inside callbacks
    const confirmedStudentId = studentId as string; // guaranteed non-null by this point

    // Guard capacity + dedupe by hand (we don't want to import the
    // registrations action here and create a server → server call).
    const courseSession = await prisma.courseSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        capacity: true,
        course: { select: { slug: true } },
      },
    });
    if (!courseSession) return { ok: false, error: "Session not found." };

    // Serializable transaction prevents concurrent over-registration (TOCTOU fix).
    try {
      const result = await prisma.$transaction(async (tx) => {
        const clash = await tx.registration.findUnique({
          where: { studentId_sessionId: { studentId: confirmedStudentId, sessionId } },
          select: { id: true },
        });
        if (clash) return { existingId: clash.id };

        const taken = await tx.registration.count({
          where: {
            sessionId,
            status: { in: ["PENDING", "CONFIRMED", "ATTENDING", "COMPLETED"] },
          },
        });
        if (taken >= courseSession.capacity) {
          throw Object.assign(
            new Error(`Course run is at capacity (${taken}/${courseSession.capacity}).`),
            { code: "FULL" }
          );
        }

        const reg = await tx.registration.create({
          data: {
            studentId: confirmedStudentId,
            sessionId,
            leadId: lead.id,
            status: d.registrationStatus,
            source: "Lead conversion",
            notes: d.notes.trim() === "" ? null : d.notes,
            confirmedAt: d.registrationStatus === "CONFIRMED" ? new Date() : null,
            salesOwnerId: session.user.id,
          },
          select: { id: true },
        });
        return { newId: reg.id };
      }, { isolationLevel: "Serializable" });

      registrationId = result.existingId ?? result.newId ?? null;
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e?.code === "FULL") return { ok: false, error: e.message ?? "Course run is at capacity." };
      if ((e as { code?: string })?.code === "P2034") {
        return { ok: false, error: "Course run just filled up. Please try another run." };
      }
      console.error("convertLead: registration failed", err);
      return { ok: false, error: "Couldn't register the student. Please try again." };
    }

    // Bump session status → FULL if we just filled it.
    const taken = await prisma.registration.count({
      where: {
        sessionId: d.sessionId,
        status: { in: ["PENDING", "CONFIRMED", "ATTENDING", "COMPLETED"] },
      },
    });
    if (taken >= courseSession.capacity) {
      await prisma.courseSession.update({
        where: { id: d.sessionId },
        data: { status: "FULL" },
      });
    }

    // Fire capacity alerts asynchronously — never blocks registration.
    void fireCourseRunCapacityAlerts(
      d.sessionId,
      taken,
      courseSession.capacity,
      courseSession.course?.slug ? (await prisma.course.findUnique({ where: { slug: courseSession.course.slug }, select: { name: true } }))?.name ?? "" : "",
      courseSession.course?.slug ?? "",
    );

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

  // Notify managers when a registration is confirmed (business-critical event).
  if (registrationId && d.registrationStatus === "CONFIRMED") {
    void (async () => {
      const [courseSession, managers] = await Promise.all([
        d.sessionId
          ? prisma.courseSession.findUnique({
              where: { id: d.sessionId },
              select: {
                startDate: true,
                course: { select: { name: true } },
              },
            })
          : null,
        prisma.user.findMany({
          where: { role: { in: ["ADMIN", "MANAGER"] } },
          select: { id: true },
        }),
      ]);
      const studentName = [lead.firstName, lead.lastName].filter(Boolean).join(" ");
      const courseName = courseSession?.course?.name ?? "—";
      const sessionDate = courseSession ? format(courseSession.startDate, "MMM d, yyyy") : "—";
      const salesRepName = session.user.name ?? session.user.email ?? "—";

      for (const m of managers) {
        if (m.id === session.user.id) continue; // don't notify the rep who did it
        NotificationService.send({
          recipientId: m.id,
          type: NotificationTypes.REGISTRATION_CONFIRMED,
          priority: "NORMAL",
          entityType: "Registration",
          entityId: registrationId,
          payload: {
            title: "New Confirmed Registration",
            body: `${studentName} — ${courseName}`,
            studentName,
            studentId,
            courseName,
            sessionDate,
            salesRepName,
            paymentStatus: "Unpaid",
          },
        });
      }
    })();
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${lead.id}`);
  revalidatePath(`/students/${studentId}`);

  return {
    ok: true,
    data: { leadId: lead.id, studentId, registrationId, reused },
  };
}

const VALID_LEAD_STATUSES = [
  "NEW", "ASSIGNED", "CONTACTED", "INTERESTED", "CONFIRMED",
  "REGISTERED", "LOST", "NOT_INTERESTED", "UNREACHABLE",
] as const;
type ValidLeadStatus = (typeof VALID_LEAD_STATUSES)[number];

export async function bulkUpdateLeadStatus(
  ids: string[],
  status: string
): Promise<Result<{ count: number }>> {
  if (!ids.length) return { ok: false, error: "No leads selected." };
  if (ids.length > 500) return { ok: false, error: "Select at most 500 leads at a time." };
  if (!(VALID_LEAD_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: "Invalid status value." };
  }
  const session = await requirePermissionAction("leads.write");
  try {
    // SALES role: can only update leads assigned to them.
    const where: Prisma.LeadWhereInput = session.user.role === "SALES"
      ? { id: { in: ids }, ownerId: session.user.id }
      : { id: { in: ids } };
    const result = await prisma.lead.updateMany({
      where,
      data: { status: status as ValidLeadStatus },
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
        // See comment in createLead — city column exists in DB, client is stale.
        city: emptyToNull(d.city ?? "") as never,
        preferredCallTime: emptyToNull(d.preferredCallTime ?? "") as never,
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

  // Promote NEW → ASSIGNED when a lead gets its first owner.
  // Never demote a lead that has already progressed beyond ASSIGNED.
  const EARLY_STATUSES = new Set(["NEW", "ASSIGNED"]);
  const leadForStatus = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { status: true },
  });
  const shouldPromote = newOwnerId && leadForStatus && EARLY_STATUSES.has(leadForStatus.status);

  try {
    await prisma.$transaction([
      prisma.lead.update({
        where: { id: leadId },
        data: {
          ownerId: newOwnerId,
          assignedById: newOwnerId ? session.user.id : null,
          assignedAt: newOwnerId ? now : null,
          ...(shouldPromote ? { status: "ASSIGNED" } : {}),
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

    // Reset viewed indicator so the new owner sees the "New" badge in their workspace.
    // Raw SQL because viewedByOwnerAt was added after the last `prisma generate`.
    if (newOwnerId !== lead.ownerId) {
      await prisma.$executeRaw`UPDATE "Lead" SET "viewedByOwnerAt" = NULL WHERE id = ${leadId}`;
    }

    void recordActivity({
      type: "lead.assigned",
      entity: "Lead",
      entityId: leadId,
      userId: session.user.id,
      meta: { from: lead.ownerId, to: newOwnerId, toName: targetUser?.name ?? null },
    });

    // Notify the new owner — distinguish fresh assignment from reassignment.
    if (newOwnerId && newOwnerId !== session.user.id) {
      const leadName = [lead.firstName, lead.lastName].filter(Boolean).join(" ");
      const isReassignment = !!lead.ownerId && lead.ownerId !== newOwnerId;
      const prevOwner = isReassignment && lead.ownerId
        ? await prisma.user.findUnique({ where: { id: lead.ownerId }, select: { name: true } })
        : null;

      NotificationService.send({
        recipientId: newOwnerId,
        type: isReassignment ? NotificationTypes.LEAD_REASSIGNED : NotificationTypes.LEAD_ASSIGNED,
        entityType: "Lead",
        entityId: leadId,
        payload: {
          title: isReassignment ? "Lead assigned to you" : "New lead assigned to you",
          body: leadName,
          leadName,
          leadId,
          courseName: lead.course?.name ?? null,
          fromRepName: prevOwner?.name ?? "another rep",
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
      // Only promote leads that are still in early-pipeline stages.
      await tx.lead.updateMany({
        where: { id: { in: leadIds }, status: { in: ["NEW", "ASSIGNED"] } },
        data: { ownerId: assigneeId, assignedById: session.user.id, assignedAt: now, status: "ASSIGNED" },
      });
      // Leads already past ASSIGNED keep their status but get the new owner.
      await tx.lead.updateMany({
        where: { id: { in: leadIds }, status: { notIn: ["NEW", "ASSIGNED"] } },
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

    // Reset viewed indicator for all bulk-assigned leads (best-effort).
    try {
      await prisma.$executeRaw(
        Prisma.sql`UPDATE "Lead" SET "viewedByOwnerAt" = NULL WHERE id IN (${Prisma.join(leadIds)})`
      );
    } catch { /* non-critical */ }

    revalidatePath("/leads");
    return { ok: true, data: { assigned: leadIds.length } };
  } catch (err) {
    console.error("bulkAssignLeads failed", err);
    return { ok: false, error: "Couldn't assign the leads. Please try again." };
  }
}

// ── Session selection ──────────────────────────────────────────────────────────

// Fetch the session currently assigned to a lead (interestedSessionId).
// Uses raw SQL because the field was added by the sales_operations migration
// and the Prisma client needs to be regenerated to expose it in the typed API.
export async function getLeadInterestedSession(leadId: string) {
  await requirePermissionAction("leads.view");

  const rows = await prisma.$queryRaw<Array<{ interestedSessionId: string | null }>>`
    SELECT "interestedSessionId" FROM "Lead" WHERE id = ${leadId}
  `;
  const sessionId = rows[0]?.interestedSessionId;
  if (!sessionId) return null;

  const session = await prisma.courseSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      title: true,
      startDate: true,
      endDate: true,
      location: true,
      city: true,
      capacity: true,
      status: true,
      course: { select: { id: true, name: true, slug: true } },
    },
  });

  return session;
}

export type LeadInterestedSession = NonNullable<Awaited<ReturnType<typeof getLeadInterestedSession>>>;

// Sessions the Sales rep can present to the lead for a given course.
export async function getAvailableSessionsForLead(leadId: string) {
  const session = await requirePermissionAction("leads.view");

  const lead = await prisma.lead.findUnique({
    where: session.user.role === "SALES"
      ? { id: leadId, ownerId: session.user.id }
      : { id: leadId },
    select: { id: true, courseId: true },
  });
  if (!lead) return [];

  const now = new Date();
  const rows = await prisma.courseSession.findMany({
    where: {
      endDate: { gte: now },
      status: { notIn: ["CANCELLED", "COMPLETED"] },
      ...(lead.courseId ? { courseId: lead.courseId } : {}),
    },
    orderBy: { startDate: "asc" },
    take: 30,
    include: {
      course: { select: { id: true, name: true, slug: true } },
      _count: {
        select: {
          registrations: {
            where: { status: { in: ["PENDING", "CONFIRMED", "ATTENDING", "COMPLETED"] } },
          },
        },
      },
    },
  });

  return rows.map((s) => ({
    id: s.id,
    title: s.title,
    courseId: s.courseId,
    courseName: s.course.name,
    courseSlug: s.course.slug,
    startDate: s.startDate,
    endDate: s.endDate,
    location: s.location,
    city: s.city,
    capacity: s.capacity,
    seatsTaken: s._count.registrations,
    status: s.status,
  }));
}

export type AvailableSession = Awaited<ReturnType<typeof getAvailableSessionsForLead>>[number];

// Sales rep assigns a specific session to a lead (before formal conversion).
// Records the previous session in activity so the history is auditable.
export async function assignLeadSession(
  leadId: string,
  sessionId: string,
): Promise<Result<null>> {
  const session = await requirePermissionAction("leads.write");

  const access = await assertLeadWriteAccess(leadId, session.user.id, session.user.role ?? "");
  if (!access.ok) return access;

  const [lead, courseSession] = await Promise.all([
    prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, courseId: true },
    }),
    prisma.courseSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        courseId: true,
        startDate: true,
        capacity: true,
        status: true,
        course: { select: { id: true, name: true } },
        _count: {
          select: {
            registrations: {
              where: { status: { in: ["PENDING", "CONFIRMED", "ATTENDING", "COMPLETED"] } },
            },
          },
        },
      },
    }),
  ]);

  if (!lead) return { ok: false, error: "Lead not found." };
  if (!courseSession) return { ok: false, error: "Session not found." };
  if (courseSession.status === "CANCELLED") return { ok: false, error: "This session has been cancelled." };
  if (courseSession.status === "FULL" || courseSession._count.registrations >= courseSession.capacity) {
    return { ok: false, error: "This session is at full capacity." };
  }

  try {
    // Use raw SQL because interestedSessionId is a new column added by the
    // sales_operations migration — prisma generate needs to run after the
    // migration to surface this field in the generated client types.
    await prisma.$executeRaw`
      UPDATE "Lead"
      SET "interestedSessionId" = ${sessionId},
          "courseId" = ${courseSession.courseId},
          "updatedAt" = NOW()
      WHERE id = ${leadId}
    `;

    void recordActivity({
      type: "lead.session_selected",
      entity: "Lead",
      entityId: leadId,
      userId: session.user.id,
      meta: {
        newSessionId: sessionId,
        courseName: courseSession.course.name,
        sessionDate: courseSession.startDate.toISOString(),
      },
    });

    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/leads");
    return { ok: true, data: null };
  } catch (err) {
    console.error("assignLeadSession failed", err);
    return { ok: false, error: "Couldn't assign the session. Please try again." };
  }
}

// Remove the session interest without full conversion.
export async function removeLeadSession(leadId: string): Promise<Result<null>> {
  const session = await requirePermissionAction("leads.write");
  const access = await assertLeadWriteAccess(leadId, session.user.id, session.user.role ?? "");
  if (!access.ok) return access;

  try {
    await prisma.$executeRaw`
      UPDATE "Lead" SET "interestedSessionId" = NULL, "updatedAt" = NOW()
      WHERE id = ${leadId}
    `;
    void recordActivity({
      type: "lead.session_removed",
      entity: "Lead",
      entityId: leadId,
      userId: session.user.id,
    });
    revalidatePath(`/leads/${leadId}`);
    return { ok: true, data: null };
  } catch (err) {
    console.error("removeLeadSession failed", err);
    return { ok: false, error: "Couldn't remove the session. Please try again." };
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

// ── Lead Merge ─────────────────────────────────────────────────────────────────

// Returns leads that could be duplicates of a given lead — for the merge dialog.
export async function getLeadDuplicatesForMerge(leadId: string) {
  await requirePermissionAction("leads.assign");

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true, email: true, phone: true, firstName: true, lastName: true },
  });
  if (!lead) return [];

  const dupes = await findPotentialDuplicates(lead.email, lead.phone);
  // Return only leads (not students), excluding the lead itself
  return dupes.filter((d) => d.type === "lead" && d.id !== leadId);
}

export async function mergeLeads(
  primaryLeadId: string,
  secondaryLeadId: string
): Promise<Result<null>> {
  const authSession = await requirePermissionAction("leads.assign");

  if (primaryLeadId === secondaryLeadId) {
    return { ok: false, error: "Cannot merge a lead with itself." };
  }

  const [primary, secondary] = await Promise.all([
    prisma.lead.findUnique({
      where: { id: primaryLeadId },
      select: { id: true, firstName: true, lastName: true, studentId: true, notes: true },
    }),
    prisma.lead.findUnique({
      where: { id: secondaryLeadId },
      select: { id: true, firstName: true, lastName: true, studentId: true, notes: true },
    }),
  ]);

  if (!primary) return { ok: false, error: "Primary lead not found." };
  if (!secondary) return { ok: false, error: "Secondary lead not found." };

  // Block if both leads have different converted students — staff must resolve manually.
  if (
    primary.studentId &&
    secondary.studentId &&
    primary.studentId !== secondary.studentId
  ) {
    return {
      ok: false,
      error:
        "Both leads have different student profiles. Please unlink one before merging.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Move communications from secondary → primary
      await tx.communication.updateMany({
        where: { leadId: secondaryLeadId },
        data: { leadId: primaryLeadId },
      });

      // Move assignment history from secondary → primary
      await tx.leadAssignment.updateMany({
        where: { leadId: secondaryLeadId },
        data: { leadId: primaryLeadId },
      });

      // Move registration attribution from secondary → primary
      await tx.registration.updateMany({
        where: { leadId: secondaryLeadId },
        data: { leadId: primaryLeadId },
      });

      // Move activity log entries from secondary → primary
      await tx.activity.updateMany({
        where: { entity: "Lead", entityId: secondaryLeadId },
        data: { entityId: primaryLeadId },
      });

      // If primary has no student but secondary does, inherit it
      const inheritStudentId =
        !primary.studentId && secondary.studentId ? secondary.studentId : undefined;
      if (inheritStudentId) {
        await tx.lead.update({
          where: { id: primaryLeadId },
          data: { studentId: inheritStudentId },
        });
      }

      const secondaryName =
        [secondary.firstName, secondary.lastName].filter(Boolean).join(" ") || secondaryLeadId;

      // Soft-close the secondary lead
      await tx.lead.update({
        where: { id: secondaryLeadId },
        data: {
          status: "LOST",
          notes: secondary.notes
            ? `${secondary.notes}\n\n[Merged into ${primaryLeadId}]`
            : `[Merged into ${primaryLeadId}]`,
        },
      });

      // Record the merge event on the primary
      await tx.activity.create({
        data: {
          type: "lead.merged",
          entity: "Lead",
          entityId: primaryLeadId,
          userId: authSession.user.id,
          meta: { secondaryLeadId, secondaryName },
        },
      });
    });

    revalidatePath("/leads");
    revalidatePath(`/leads/${primaryLeadId}`);
    revalidatePath(`/leads/${secondaryLeadId}`);
    return { ok: true, data: null };
  } catch (err) {
    console.error("mergeLeads failed", err);
    return { ok: false, error: "Couldn't merge the leads. Please try again." };
  }
}

// ── Lead Drawer Data ───────────────────────────────────────────────────────────

export type DrawerPaymentSummary = {
  agreedPrice: number;
  totalPaid: number;
  remaining: number;
  paymentStatus: "UNPAID" | "PARTIALLY_PAID" | "FULLY_PAID";
};

export type LeadDrawerData = {
  notes: string | null;
  recentActivity: ActivityRow[];
  interestedSessionId: string | null;
  registrationId: string | null;
  paymentSummary: DrawerPaymentSummary | null;
};

function serializeDecimal(v: unknown): number {
  const n = Number(String(v));
  return Number.isFinite(n) ? n : 0;
}

export async function getLeadDrawerData(leadId: string): Promise<LeadDrawerData | null> {
  const session = await requirePermissionAction("leads.view");

  const where = session.user.role === "SALES"
    ? { id: leadId, ownerId: session.user.id }
    : { id: leadId };

  const [lead, recentActivity, sessionRows, registration] = await Promise.all([
    prisma.lead.findUnique({ where, select: { notes: true } }),
    getActivitiesForEntity("Lead", leadId, 6),
    prisma.$queryRaw<Array<{ interestedSessionId: string | null }>>`
      SELECT "interestedSessionId" FROM "Lead" WHERE id = ${leadId}
    `,
    prisma.registration.findFirst({
      where: { leadId },
      orderBy: { registeredAt: "desc" },
      select: {
        id: true,
        agreedPrice: true,
        session: { select: { price: true } },
        payments: {
          where: { status: "COMPLETED" },
          select: { amount: true },
        },
      },
    }),
  ]);

  if (!lead) return null;

  let paymentSummary: DrawerPaymentSummary | null = null;
  if (registration) {
    const agreedPrice =
      registration.agreedPrice != null
        ? serializeDecimal(registration.agreedPrice)
        : serializeDecimal(registration.session.price);
    const totalPaid = registration.payments.reduce(
      (sum, p) => sum + serializeDecimal(p.amount),
      0
    );
    const remaining = Math.max(0, agreedPrice - totalPaid);
    paymentSummary = {
      agreedPrice,
      totalPaid,
      remaining,
      paymentStatus:
        agreedPrice === 0
          ? "FULLY_PAID"
          : totalPaid === 0
            ? "UNPAID"
            : remaining === 0
              ? "FULLY_PAID"
              : "PARTIALLY_PAID",
    };
  }

  return {
    notes: lead.notes,
    recentActivity,
    interestedSessionId: sessionRows[0]?.interestedSessionId ?? null,
    registrationId: registration?.id ?? null,
    paymentSummary,
  };
}

// Update the course a lead is interested in.
export async function updateLeadCourse(
  leadId: string,
  courseId: string | null,
): Promise<Result<null>> {
  const session = await requirePermissionAction("leads.write");

  const lead = await prisma.lead.findUnique({
    where: session.user.role === "SALES"
      ? { id: leadId, ownerId: session.user.id }
      : { id: leadId },
    select: { id: true },
  });
  if (!lead) return { ok: false, error: "Lead not found or access denied." };

  if (courseId) {
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
    if (!course) return { ok: false, error: "Course not found." };
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: { courseId },
  });

  void recordActivity({
    type: "lead.updated",
    entity: "Lead",
    entityId: leadId,
    userId: session.user.id,
    meta: { field: "courseId", to: courseId },
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  return { ok: true, data: null };
}

// Quick status update for a single lead (scoped to owner for SALES role).
export async function updateLeadStatusDirect(
  leadId: string,
  status: string
): Promise<Result<null>> {
  const session = await requirePermissionAction("leads.write");
  const oldLead = await prisma.lead.findUnique({
    where: session.user.role === "SALES"
      ? { id: leadId, ownerId: session.user.id }
      : { id: leadId },
    select: { status: true },
  });
  if (!oldLead) return { ok: false, error: "Lead not found or access denied." };

  await prisma.lead.update({
    where: { id: leadId },
    data: { status: status as ValidLeadStatus },
  });

  void recordActivity({
    type: "lead.status_changed",
    entity: "Lead",
    entityId: leadId,
    userId: session.user.id,
    meta: { from: oldLead.status, to: status },
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/my-leads");
  return { ok: true, data: null };
}

// ── Registration from Drawer (Task 5.4) ───────────────────────────────────────

export async function createRegistrationFromLead(
  leadId: string,
  sessionId: string,
  agreedPrice: number | null,
): Promise<Result<{ registrationId: string; studentId: string }>> {
  const authSession = await requirePermissionAction("leads.write");

  const lead = await prisma.lead.findUnique({
    where: authSession.user.role === "SALES"
      ? { id: leadId, ownerId: authSession.user.id }
      : { id: leadId },
    select: {
      id: true, firstName: true, lastName: true, email: true, phone: true,
      notes: true, tags: true, studentId: true,
    },
  });
  if (!lead) return { ok: false, error: "Lead not found or access denied." };
  if (!lead.firstName) return { ok: false, error: "Lead needs at least a first name." };

  const courseSession = await prisma.courseSession.findUnique({
    where: { id: sessionId },
    select: { id: true, startDate: true, capacity: true, course: { select: { slug: true, name: true } } },
  });
  if (!courseSession) return { ok: false, error: "Course run not found." };

  // Resolve or create student (same dedup logic as convertLead).
  let studentId = lead.studentId ?? null;
  let reused = false;
  if (!studentId) {
    const normEmail = normalizeEmail(lead.email);
    if (normEmail) {
      const existing = await prisma.student.findUnique({ where: { email: normEmail }, select: { id: true } });
      if (existing) { studentId = existing.id; reused = true; }
    }
    if (!studentId) {
      try {
        const created = await prisma.student.create({
          data: {
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: normalizeEmail(lead.email),
            phone: lead.phone,
            notes: lead.notes,
            tags: lead.tags,
          },
          select: { id: true },
        });
        studentId = created.id;
      } catch (err) {
        console.error("createRegistrationFromLead: student create failed", err);
        return { ok: false, error: "Couldn't create student record. Please try again." };
      }
    }
  }

  // Capacity-guarded transactional registration (serializable to prevent TOCTOU).
  let registrationId: string;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const clash = await tx.registration.findUnique({
        where: { studentId_sessionId: { studentId: studentId!, sessionId } },
        select: { id: true },
      });
      if (clash) return { existingId: clash.id, newId: null };

      const taken = await tx.registration.count({
        where: { sessionId, status: { in: ["PENDING", "CONFIRMED", "ATTENDING", "COMPLETED"] } },
      });
      if (taken >= courseSession.capacity) {
        throw Object.assign(
          new Error(`Course run is at capacity (${taken}/${courseSession.capacity}).`),
          { code: "FULL" }
        );
      }

      const reg = await tx.registration.create({
        data: {
          studentId: studentId!,
          sessionId,
          leadId,
          status: "CONFIRMED",
          source: "Drawer conversion",
          confirmedAt: new Date(),
          salesOwnerId: authSession.user.id,
          agreedPrice: agreedPrice != null ? agreedPrice : undefined,
        },
        select: { id: true },
      });
      return { existingId: null, newId: reg.id };
    }, { isolationLevel: "Serializable" });

    registrationId = result.existingId ?? result.newId!;
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e?.code === "FULL") return { ok: false, error: e.message ?? "Course run is at capacity." };
    if (e?.code === "P2034") return { ok: false, error: "Course run just filled up — please select another." };
    console.error("createRegistrationFromLead: transaction failed", err);
    return { ok: false, error: "Couldn't create registration. Please try again." };
  }

  // Check if session is now full and update its status.
  const taken = await prisma.registration.count({
    where: { sessionId, status: { in: ["PENDING", "CONFIRMED", "ATTENDING", "COMPLETED"] } },
  });
  if (taken >= courseSession.capacity) {
    await prisma.courseSession.update({ where: { id: sessionId }, data: { status: "FULL" } });
  }

  // Fire capacity alerts asynchronously.
  void fireCourseRunCapacityAlerts(
    sessionId,
    taken,
    courseSession.capacity,
    courseSession.course?.name ?? "",
    courseSession.course?.slug ?? "",
  );

  // Link student to lead and flip status to REGISTERED.
  await prisma.lead.update({
    where: { id: leadId },
    data: { studentId: studentId!, status: "REGISTERED" },
  });

  void recordActivity({
    type: "lead.converted",
    entity: "Lead",
    entityId: leadId,
    userId: authSession.user.id,
    meta: { studentId, registrationId, reused, courseName: courseSession.course?.name ?? null },
  });

  // Notify managers of the confirmed registration.
  void (async () => {
    const managers = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "MANAGER"] } },
      select: { id: true },
    });
    const studentName = [lead.firstName, lead.lastName].filter(Boolean).join(" ");
    const courseName = courseSession.course?.name ?? "—";
    const sessionDate = format(courseSession.startDate, "MMM d, yyyy");
    const salesRepName = authSession.user.name ?? authSession.user.email ?? "—";

    for (const m of managers) {
      if (m.id === authSession.user.id) continue;
      NotificationService.send({
        recipientId: m.id,
        type: NotificationTypes.REGISTRATION_CONFIRMED,
        priority: "NORMAL",
        entityType: "Registration",
        entityId: registrationId,
        payload: {
          title: "New Confirmed Registration",
          body: `${studentName} — ${courseName}`,
          studentName,
          studentId: studentId!,
          courseName,
          sessionDate,
          salesRepName,
          paymentStatus: "Unpaid",
        },
      });
    }
  })();

  if (courseSession.course?.slug) revalidatePath(`/courses/${courseSession.course.slug}`);
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/my-leads");
  revalidatePath("/students");
  return { ok: true, data: { registrationId, studentId: studentId! } };
}
