"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "New password must be at least 8 characters").max(200),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export async function updateProfile(
  input: UpdateProfileInput
): Promise<Result<null>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Not authenticated" };
  }

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: parsed.data.name },
      select: { id: true },
    });
    revalidatePath("/account");
    return { ok: true, data: null };
  } catch (err) {
    console.error("updateProfile failed", err);
    return { ok: false, error: "Couldn't update your profile. Please try again." };
  }
}

export async function changePassword(
  input: ChangePasswordInput
): Promise<Result<null>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Not authenticated" };
  }

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const d = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { hashedPassword: true },
  });

  // Users who signed in via OAuth (Google/GitHub) may not have a password.
  if (!user?.hashedPassword) {
    return {
      ok: false,
      error:
        "Your account uses social sign-in (Google/GitHub). You can't set a password here.",
    };
  }

  const currentOk = await bcrypt.compare(d.currentPassword, user.hashedPassword);
  if (!currentOk) {
    return { ok: false, error: "Current password is incorrect." };
  }

  // Prevent re-using the same password.
  const sameAsNew = await bcrypt.compare(d.newPassword, user.hashedPassword);
  if (sameAsNew) {
    return {
      ok: false,
      error: "New password must be different from the current one.",
    };
  }

  const hashedPassword = await bcrypt.hash(d.newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { hashedPassword },
    select: { id: true },
  });

  return { ok: true, data: null };
}
