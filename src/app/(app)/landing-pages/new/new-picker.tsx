"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Check, Loader2, BookOpen } from "lucide-react";
import { BackArrow, ForwardArrow } from "@/components/primitives/nav-arrow";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/primitives/empty-state";
import { cn } from "@/lib/utils";
import { TEMPLATES } from "@/lib/landing-blocks/templates";
import { createLandingPage } from "../actions";

export interface CoursePickerItem {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  status: string;
}

export function NewLandingPagePicker({ courses }: { courses: CoursePickerItem[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Deep-link preselect: `/landing-pages/new?courseId=…` jumps past the course
  // picker straight to template selection. Falls back to normal flow if the
  // id doesn't match any available course.
  const preselectedCourseId = React.useMemo(() => {
    const raw = searchParams.get("courseId");
    if (!raw) return null;
    return courses.some((c) => c.id === raw) ? raw : null;
  }, [searchParams, courses]);

  const [step, setStep] = React.useState<"course" | "template">(
    preselectedCourseId ? "template" : "course"
  );
  const [courseId, setCourseId] = React.useState<string | null>(preselectedCourseId);
  const [templateId, setTemplateId] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const selectedCourse = courses.find((c) => c.id === courseId);

  const onCreate = () => {
    if (!courseId || !templateId) return;
    startTransition(async () => {
      const res = await createLandingPage({ courseId, templateId });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Landing page created");
      router.push(`/landing-pages/${res.data.id}/edit`);
    });
  };

  if (courses.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="You need a course first"
        description="Landing pages are attached to a course. Create one to continue."
        action={
          <Button asChild>
            <Link href="/courses">Go to courses</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <ol className="flex items-center gap-3 text-sm">
        <Step index={1} label="Choose a course" active={step === "course"} done={!!courseId} />
        <div className="h-px flex-1 bg-border/70" />
        <Step index={2} label="Choose a template" active={step === "template"} done={!!templateId} />
      </ol>

      {step === "course" ? (
        <section className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => {
              const selected = courseId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCourseId(c.id)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-4 text-start transition-colors",
                    selected
                      ? "border-primary ring-2 ring-primary/25 bg-primary/5"
                      : "border-border/70 hover:border-border bg-card"
                  )}
                >
                  <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <BookOpen className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="truncate text-sm font-medium">{c.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {c.category ?? "Uncategorized"} · {c.status.toLowerCase()}
                    </div>
                  </div>
                  {selected ? (
                    <Check className="size-4 shrink-0 text-primary" />
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" asChild>
              <Link href="/landing-pages">Cancel</Link>
            </Button>
            <Button
              onClick={() => setStep("template")}
              disabled={!courseId}
            >
              Continue <ForwardArrow />
            </Button>
          </div>
        </section>
      ) : (
        <section className="space-y-3">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {TEMPLATES.map((t) => {
              const selected = templateId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplateId(t.id)}
                  className={cn(
                    "group flex flex-col overflow-hidden rounded-xl border text-start transition-colors",
                    selected
                      ? "border-primary ring-2 ring-primary/25"
                      : "border-border/70 hover:border-border"
                  )}
                >
                  <div
                    className="relative h-40 w-full"
                    style={{ background: t.accent }}
                  >
                    <div className="absolute inset-0 bg-black/10" />
                    <div className="relative flex h-full flex-col justify-end p-5">
                      <div className="text-xs font-medium uppercase tracking-wider text-white/80">
                        {t.category}
                      </div>
                      <div className="text-xl font-bold text-white">{t.name}</div>
                    </div>
                    {selected ? (
                      <div className="absolute top-3 end-3 grid size-7 place-items-center rounded-full bg-white text-primary shadow">
                        <Check className="size-4" />
                      </div>
                    ) : null}
                  </div>
                  <div className="border-t border-border/70 bg-card p-4">
                    <p className="text-sm text-muted-foreground">
                      {t.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-2 pt-2">
            <Button variant="ghost" onClick={() => setStep("course")}>
              <BackArrow /> Back
            </Button>
            <div className="flex items-center gap-3">
              {selectedCourse ? (
                <span className="text-xs text-muted-foreground">
                  Building for <strong className="text-foreground">{selectedCourse.name}</strong>
                </span>
              ) : null}
              <Button onClick={onCreate} disabled={!templateId || pending}>
                {pending ? <Loader2 className="animate-spin" /> : null}
                Create page
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Step({
  index,
  label,
  active,
  done,
}: {
  index: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={cn(
          "grid size-6 place-items-center rounded-full text-[11px] font-semibold",
          done
            ? "bg-primary text-primary-foreground"
            : active
            ? "border border-primary text-primary"
            : "border border-border text-muted-foreground"
        )}
      >
        {done ? <Check className="size-3" /> : index}
      </span>
      <span
        className={cn(
          "text-sm",
          active || done ? "text-foreground font-medium" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </div>
  );
}
