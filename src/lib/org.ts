import "server-only";
import { prisma } from "@/lib/prisma";

let cachedTimezone: string | null = null;

export async function getOrgTimezone(): Promise<string> {
  if (cachedTimezone) return cachedTimezone;
  const settings = await prisma.orgSettings.findUnique({
    where: { id: "default" },
    select: { timezone: true },
  });
  cachedTimezone = settings?.timezone ?? "UTC";
  return cachedTimezone;
}

export function clearOrgTimezoneCache(): void {
  cachedTimezone = null;
}
