"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requirePermissionAction } from "@/lib/auth-guards";
import { ALL_ROLES, type UserRole } from "@/lib/permissions";
import { z } from "zod";
import { CURRENCIES } from "./constants";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function requireSettings() {
  return requirePermissionAction("settings.view");
}

// ── Org settings ─────────────────────────────────────────────────────────────

export async function getOrgSettings() {
  await requireSettings();
  const existing = await prisma.orgSettings.findUnique({ where: { id: "default" } });
  if (existing) return existing;
  return prisma.orgSettings.create({
    data: { id: "default" },
  });
}

export type OrgSettingsRow = Awaited<ReturnType<typeof getOrgSettings>>;

const updateOrgSchema = z.object({
  name: z.string().trim().min(1, "Organization name is required").max(120),
  currency: z.enum(CURRENCIES, { message: "Select a valid currency" }),
  timezone: z.string().trim().min(1, "Timezone is required").max(80),
});

export type UpdateOrgInput = z.infer<typeof updateOrgSchema>;

export async function updateOrgSettings(input: UpdateOrgInput): Promise<Result<null>> {
  await requireSettings();
  const parsed = updateOrgSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  try {
    await prisma.orgSettings.upsert({
      where: { id: "default" },
      create: { id: "default", ...parsed.data },
      update: parsed.data,
    });
    revalidatePath("/settings");
    return { ok: true, data: null };
  } catch (err) {
    console.error("updateOrgSettings failed", err);
    return { ok: false, error: "Couldn't save settings. Please try again." };
  }
}

export async function listUsers() {
  await requireSettings();
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}

export type UserRow = Awaited<ReturnType<typeof listUsers>>[number];

const updateRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(ALL_ROLES as unknown as [UserRole, ...UserRole[]]),
});

const inviteUserSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().max(80).default(""),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .min(1),
  role: z.enum(ALL_ROLES as unknown as [UserRole, ...UserRole[]]),
  // Temporary password shown to the admin after creation.
  // Min 8 so it clears the app's own login validation.
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export async function inviteUser(input: {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  password: string;
}): Promise<Result<{ id: string; email: string; name: string }>> {
  await requireSettings();
  const parsed = inviteUserSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const d = parsed.data;

  const exists = await prisma.user.findUnique({
    where: { email: d.email },
    select: { id: true },
  });
  if (exists) {
    return {
      ok: false,
      error: "A user with that email already exists.",
    };
  }

  try {
    const hashedPassword = await bcrypt.hash(d.password, 12);
    const name = [d.firstName, d.lastName].filter(Boolean).join(" ");
    const created = await prisma.user.create({
      data: {
        name,
        email: d.email,
        hashedPassword,
        role: d.role,
      },
      select: { id: true, email: true, name: true },
    });
    revalidatePath("/settings");
    return {
      ok: true,
      data: { id: created.id, email: created.email, name: created.name ?? "" },
    };
  } catch (err) {
    console.error("inviteUser failed", err);
    return {
      ok: false,
      error: "Couldn't create the user. Please try again.",
    };
  }
}

export async function removeUser(userId: string): Promise<Result<null>> {
  const session = await requireSettings();
  if (userId === session.user.id) {
    return { ok: false, error: "You can't remove your own account." };
  }
  // Prevent removing the last Admin.
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (target?.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return {
        ok: false,
        error: "Can't remove the only Admin. Promote another user first.",
      };
    }
  }
  try {
    await prisma.user.delete({ where: { id: userId } });
    revalidatePath("/settings");
    return { ok: true, data: null };
  } catch (err) {
    console.error("removeUser failed", err);
    return { ok: false, error: "Couldn't remove the user. Please try again." };
  }
}

export async function updateUserRole(input: {
  userId: string;
  role: string;
}): Promise<Result<{ id: string; role: string }>> {
  const session = await requireSettings();
  const parsed = updateRoleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid role",
    };
  }

  // Prevent the last admin from demoting themselves — would lock everyone out.
  if (parsed.data.userId === session.user.id) {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1 && parsed.data.role !== "ADMIN") {
      return {
        ok: false,
        error:
          "You can't demote yourself — you're the only admin. Promote another user to Admin first.",
      };
    }
  }

  try {
    const updated = await prisma.user.update({
      where: { id: parsed.data.userId },
      data: { role: parsed.data.role },
      select: { id: true, role: true },
    });
    revalidatePath("/settings");
    return { ok: true, data: updated };
  } catch (err) {
    console.error("updateUserRole failed", err);
    return { ok: false, error: "Couldn't update the role. Please try again." };
  }
}
