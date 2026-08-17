import Link from "next/link";
import { format } from "date-fns";
import { Megaphone, TrendingUp } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { EmptyState } from "@/components/primitives/empty-state";
import { StatusBadge } from "@/components/primitives/status-badge";
import { Forbidden } from "@/components/primitives/forbidden";

export async function CourseCampaignsTab({ courseId }: { courseId: string }) {
  const session = await auth();
  if (!hasPermission(session?.user?.role, "campaigns.view")) {
    return <Forbidden />;
  }

  const campaigns = await prisma.campaign.findMany({
    where: { leads: { some: { courseId } } },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { leads: true } },
    },
  });

  if (campaigns.length === 0) {
    return (
      <EmptyState
        icon={Megaphone}
        title="No campaigns yet"
        description="Marketing campaigns that drive leads to this course will appear here automatically."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
      <header className="border-b border-border/60 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">
          Linked campaigns
        </h2>
        <p className="text-xs text-muted-foreground">
          {campaigns.length}{" "}
          {campaigns.length === 1 ? "campaign" : "campaigns"} driving traffic to
          this course
        </p>
      </header>
      <ul className="divide-y divide-border/60">
        {campaigns.map((c) => (
          <li
            key={c.id}
            className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Megaphone className="size-4" />
              </span>
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/campaigns/${c.id}`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {c.name}
                  </Link>
                  <StatusBadge status={c.status} />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {c.source ? <span>{c.source}</span> : null}
                  {c.source ? (
                    <span aria-hidden className="opacity-40">·</span>
                  ) : null}
                  <span className="inline-flex items-center gap-1">
                    <TrendingUp className="size-3" />
                    {c._count.leads}{" "}
                    {c._count.leads === 1 ? "lead" : "leads"}
                  </span>
                  {c.startDate ? (
                    <>
                      <span aria-hidden className="opacity-40">·</span>
                      <span>Started {format(c.startDate, "MMM d, yyyy")}</span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="text-end">
              <Link
                href={`/campaigns/${c.id}`}
                className="text-xs text-primary hover:underline"
              >
                View →
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
