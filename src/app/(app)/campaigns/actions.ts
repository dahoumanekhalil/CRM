"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermissionAction } from "@/lib/auth-guards";
import {
  createCampaignSchema,
  listCampaignsSchema,
  updateCampaignSchema,
  type CampaignStatus,
  type CreateCampaignInput,
  type ListCampaignsInput,
  type UpdateCampaignInput,
} from "@/lib/schemas/campaign";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const requireViewCampaigns = () => requirePermissionAction("campaigns.view");
const requireWriteCampaigns = () => requirePermissionAction("campaigns.write");

function serializeBudget(budget: unknown): number | null {
  if (budget === null || budget === undefined) return null;
  const n = Number(String(budget));
  return Number.isFinite(n) ? n : null;
}

function serializeAmount(amount: unknown): number {
  if (amount === null || amount === undefined) return 0;
  const n = Number(String(amount));
  return Number.isFinite(n) ? n : 0;
}

function parseDate(v: string): Date | null {
  if (v.trim() === "") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

const emptyToNull = (v: string) => (v.trim() === "" ? null : v);

export async function createCampaign(
  input: CreateCampaignInput
): Promise<Result<{ id: string }>> {
  const parsed = createCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  await requireWriteCampaigns();
  const d = parsed.data;

  try {
    const created = await prisma.campaign.create({
      data: {
        name: d.name,
        description: emptyToNull(d.description),
        source: emptyToNull(d.source),
        budget: d.budget ?? null,
        status: d.status,
        startDate: parseDate(d.startDate),
        endDate: parseDate(d.endDate),
      },
      select: { id: true },
    });
    revalidatePath("/campaigns");
    return { ok: true, data: created };
  } catch (err) {
    console.error("createCampaign failed", err);
    return {
      ok: false,
      error: "Couldn't save the campaign. Please try again.",
    };
  }
}

export async function updateCampaign(
  input: UpdateCampaignInput
): Promise<Result<{ id: string }>> {
  const parsed = updateCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  await requireWriteCampaigns();
  const d = parsed.data;

  const existing = await prisma.campaign.findUnique({
    where: { id: d.id },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Campaign not found." };

  try {
    await prisma.campaign.update({
      where: { id: d.id },
      data: {
        name: d.name,
        description: emptyToNull(d.description),
        source: emptyToNull(d.source),
        budget: d.budget ?? null,
        status: d.status,
        startDate: parseDate(d.startDate),
        endDate: parseDate(d.endDate),
      },
      select: { id: true },
    });
    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${d.id}`);
    return { ok: true, data: { id: d.id } };
  } catch (err) {
    console.error("updateCampaign failed", err);
    return {
      ok: false,
      error: "Couldn't save the campaign. Please try again.",
    };
  }
}

export async function setCampaignStatus(
  id: string,
  status: CampaignStatus
): Promise<Result<{ id: string }>> {
  await requireWriteCampaigns();
  await prisma.campaign.update({
    where: { id },
    data: { status },
    select: { id: true },
  });
  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${id}`);
  return { ok: true, data: { id } };
}

export async function deleteCampaign(id: string): Promise<Result<null>> {
  await requireWriteCampaigns();
  await prisma.campaign.delete({ where: { id } });
  revalidatePath("/campaigns");
  return { ok: true, data: null };
}

export async function listCampaigns(input: ListCampaignsInput) {
  const parsed = listCampaignsSchema.parse(input);
  await requireViewCampaigns();

  const where: Prisma.CampaignWhereInput = {};
  if (parsed.status !== "ALL") where.status = parsed.status;
  if (parsed.q) {
    const term = parsed.q.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
      { source: { contains: term, mode: "insensitive" } },
    ];
  }

  const orderBy: Prisma.CampaignOrderByWithRelationInput = {
    [parsed.sortBy]: parsed.sortDir,
  };

  const [rowsRaw, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      orderBy,
      skip: (parsed.page - 1) * parsed.pageSize,
      take: parsed.pageSize,
      include: {
        _count: { select: { leads: true } },
      },
    }),
    prisma.campaign.count({ where }),
  ]);

  const rows = rowsRaw.map((c) => ({
    ...c,
    budget: serializeBudget(c.budget),
  }));

  return { rows, total, page: parsed.page, pageSize: parsed.pageSize };
}

export type CampaignRow = Awaited<ReturnType<typeof listCampaigns>>["rows"][number];

export async function getCampaignDetail(id: string) {
  await requireViewCampaigns();
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      _count: { select: { leads: true } },
    },
  });
  if (!campaign) return null;
  return { ...campaign, budget: serializeBudget(campaign.budget) };
}

export type CampaignDetail = NonNullable<
  Awaited<ReturnType<typeof getCampaignDetail>>
>;

// Aggregate metrics for the campaign overview.
export async function getCampaignMetrics(campaignId: string) {
  await requireViewCampaigns();

  const [totalLeads, convertedLeads, distinctStudents, unsubscribed] =
    await Promise.all([
      prisma.lead.count({ where: { campaignId } }),
      prisma.lead.count({
        where: { campaignId, studentId: { not: null } },
      }),
      prisma.lead
        .findMany({
          where: { campaignId, studentId: { not: null } },
          select: { studentId: true },
          distinct: ["studentId"],
        })
        .then((rows) => rows.length),
      prisma.lead.count({ where: { campaignId, subscribed: false } }),
    ]);

  // Revenue: completed payments belonging to registrations of students that
  // were originally captured by this campaign.
  const studentIdRows = await prisma.lead.findMany({
    where: { campaignId, studentId: { not: null } },
    select: { studentId: true },
    distinct: ["studentId"],
  });
  const studentIds = studentIdRows
    .map((r) => r.studentId)
    .filter((id): id is string => Boolean(id));

  let revenueByCurrency: Record<string, number> = {};
  if (studentIds.length > 0) {
    const grouped = await prisma.payment.groupBy({
      by: ["currency"],
      where: {
        status: "COMPLETED",
        studentId: { in: studentIds },
      },
      _sum: { amount: true },
    });
    revenueByCurrency = grouped.reduce<Record<string, number>>((acc, row) => {
      const amt = serializeAmount(row._sum.amount);
      if (amt > 0) acc[row.currency] = amt;
      return acc;
    }, {});
  }

  return {
    totalLeads,
    convertedLeads,
    distinctStudents,
    unsubscribed,
    revenueByCurrency,
  };
}

export type CampaignMetrics = Awaited<ReturnType<typeof getCampaignMetrics>>;

// Leads attributed to this campaign — used by the Leads tab.
export async function getLeadsForCampaign(campaignId: string) {
  await requireViewCampaigns();
  return prisma.lead.findMany({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      course: { select: { id: true, name: true, slug: true } },
      student: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

export type CampaignLeadRow = Awaited<
  ReturnType<typeof getLeadsForCampaign>
>[number];

// UTM breakdown for the attribution tab.
export async function getCampaignAttribution(campaignId: string) {
  await requireViewCampaigns();
  const [sources, mediums, campaigns] = await Promise.all([
    prisma.lead.groupBy({
      by: ["utmSource"],
      where: { campaignId },
      _count: { _all: true },
    }),
    prisma.lead.groupBy({
      by: ["utmMedium"],
      where: { campaignId },
      _count: { _all: true },
    }),
    prisma.lead.groupBy({
      by: ["utmCampaign"],
      where: { campaignId },
      _count: { _all: true },
    }),
  ]);

  const toBuckets = (
    rows: Array<{ _count: { _all: number } } & Record<string, unknown>>,
    key: string
  ) =>
    rows
      .map((r) => ({
        label: (r[key] as string | null)?.trim() || "(none)",
        count: r._count._all,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

  return {
    utmSources: toBuckets(sources, "utmSource"),
    utmMediums: toBuckets(mediums, "utmMedium"),
    utmCampaigns: toBuckets(campaigns, "utmCampaign"),
  };
}

export type CampaignAttribution = Awaited<
  ReturnType<typeof getCampaignAttribution>
>;
