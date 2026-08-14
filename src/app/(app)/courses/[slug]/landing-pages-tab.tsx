import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Globe, Plus } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/primitives/status-badge";
import { EmptyState } from "@/components/primitives/empty-state";
import { Button } from "@/components/ui/button";

export async function LandingPagesTab({
  courseId,
  courseName,
}: {
  courseId: string;
  courseName: string;
}) {
  const pages = await prisma.landingPage.findMany({
    where: { courseId },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      publishedAt: true,
      updatedAt: true,
    },
  });

  if (pages.length === 0) {
    return (
      <EmptyState
        icon={Globe}
        title="No landing pages for this course yet"
        description="Landing pages are how you promote and collect registrations. Pick a template and customize the content."
        action={
          <Button asChild>
            <Link href={`/landing-pages/new?courseId=${courseId}`}>
              <Plus /> Create landing page
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
      <header className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">
            Pages for {courseName}
          </h2>
          <p className="text-xs text-muted-foreground">
            {pages.length} {pages.length === 1 ? "page" : "pages"}
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href={`/landing-pages/new?courseId=${courseId}`}>
            <Plus /> New landing page
          </Link>
        </Button>
      </header>
      <ul className="divide-y divide-border/60">
        {pages.map((page) => (
          <li key={page.id}>
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-md border border-border/70 bg-muted/40 text-muted-foreground">
                <Globe className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/landing-pages/${page.id}/edit`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {page.title}
                  </Link>
                  <StatusBadge status={page.status} />
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  /p/{page.slug}
                  <span className="mx-1.5 opacity-40">·</span>
                  Updated {formatDistanceToNow(page.updatedAt, { addSuffix: true })}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {page.status === "PUBLISHED" ? (
                  <Button variant="ghost" size="sm" asChild>
                    <a
                      href={`/p/${page.slug}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink /> View
                    </a>
                  </Button>
                ) : null}
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/landing-pages/${page.id}/edit`}>Edit</Link>
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
