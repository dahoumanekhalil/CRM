import Link from "next/link";
import Image from "next/image";
import { BookOpen, ExternalLink, Plus } from "lucide-react";
import { BackArrow } from "@/components/primitives/nav-arrow";
import { StatusBadge } from "@/components/primitives/status-badge";
import { Button } from "@/components/ui/button";
import type { CourseDetail } from "../actions";
import { CourseHeaderActions } from "./course-header-actions";

const humanize = (s: string) =>
  s
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

function formatPrice(amount: unknown, currency: string): string | null {
  if (amount === null || amount === undefined) return null;
  const n =
    typeof amount === "object" ? Number(amount?.toString?.()) : Number(amount);
  if (!Number.isFinite(n)) return null;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${n.toLocaleString()} ${currency}`;
  }
}

export function CourseHeader({ detail }: { detail: CourseDetail }) {
  const { course, publishedPageSlug } = detail;
  const price = formatPrice(course.basePrice, course.currency);

  return (
    <header className="border-b border-border/60">
      {/* Breadcrumb / back */}
      <div className="border-b border-border/40 bg-muted/20 px-6 py-2">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-7 px-2 text-xs text-muted-foreground"
        >
          <Link href="/courses">
            <BackArrow className="size-3.5" /> All courses
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-6 px-6 py-6 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {/* Cover / fallback */}
          {course.imageUrl ? (
            <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border/70">
              <Image
                src={course.imageUrl}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="grid size-16 shrink-0 place-items-center rounded-lg border border-border/70 bg-primary/5 text-primary">
              <BookOpen className="size-6" />
            </div>
          )}

          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">
                {course.name}
              </h1>
              <StatusBadge status={course.status} />
            </div>
            {course.summary ? (
              <p className="max-w-2xl text-sm text-muted-foreground">
                {course.summary}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {course.category ? (
                <span className="inline-flex items-center rounded-md border border-border/60 bg-muted/40 px-2 py-0.5">
                  {course.category}
                </span>
              ) : null}
              <span>{humanize(course.level)}</span>
              {course.durationHours ? (
                <>
                  <span aria-hidden className="opacity-40">
                    ·
                  </span>
                  <span>{course.durationHours}h total</span>
                </>
              ) : null}
              {price ? (
                <>
                  <span aria-hidden className="opacity-40">
                    ·
                  </span>
                  <span className="font-medium text-foreground">{price}</span>
                </>
              ) : null}
              <span aria-hidden className="opacity-40">
                ·
              </span>
              <span className="font-mono text-[11px]">/{course.slug}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:shrink-0">
          {publishedPageSlug ? (
            <Button variant="outline" size="sm" asChild>
              <a
                href={`/p/${publishedPageSlug}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink /> View public
              </a>
            </Button>
          ) : null}
          <Button size="sm" asChild>
            <Link href={`/landing-pages/new?courseId=${course.id}`}>
              <Plus /> Landing page
            </Link>
          </Button>
          <CourseHeaderActions course={course} />
        </div>
      </div>
    </header>
  );
}
