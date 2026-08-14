import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { BookOpen, Calendar, Mail, Megaphone, Phone, User } from "lucide-react";
import type { LeadDetail } from "../actions";

export function OverviewTab({ lead }: { lead: LeadDetail }) {
  const facts: Array<{
    label: string;
    value: React.ReactNode;
    icon: typeof Mail;
  }> = [
    { label: "Email", value: lead.email ?? "—", icon: Mail },
    { label: "Phone", value: lead.phone ?? "—", icon: Phone },
    { label: "Source", value: lead.source ?? "—", icon: Megaphone },
    {
      label: "Interested in",
      value: lead.course ? (
        <Link
          href={`/courses/${lead.course.slug}`}
          className="hover:underline"
        >
          {lead.course.name}
        </Link>
      ) : (
        "—"
      ),
      icon: BookOpen,
    },
    {
      label: "Assigned to",
      value: lead.owner?.name ?? lead.owner?.email ?? "Unassigned",
      icon: User,
    },
    {
      label: "Added",
      value: formatDistanceToNow(lead.createdAt, { addSuffix: true }),
      icon: Calendar,
    },
    {
      label: "Last contacted",
      value: lead.lastContactedAt
        ? formatDistanceToNow(lead.lastContactedAt, { addSuffix: true })
        : "Never",
      icon: Calendar,
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <section className="rounded-xl border border-border/60 bg-card p-6">
          <h2 className="mb-3 text-sm font-semibold tracking-tight">
            About this lead
          </h2>
          {lead.notes ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {lead.notes}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No notes yet. Add context from the Edit sheet — a good place to
              record what they said on the phone or in a demo.
            </p>
          )}
        </section>

        {lead.student ? (
          <section className="rounded-xl border border-success/40 bg-success/5 p-6">
            <div className="flex items-center gap-3 text-sm">
              <span className="grid size-8 place-items-center rounded-full bg-success/15 text-success">
                <User className="size-4" />
              </span>
              <div>
                <div className="font-medium">Converted to student</div>
                <Link
                  href={`/students/${lead.student.id}`}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  {[lead.student.firstName, lead.student.lastName]
                    .filter(Boolean)
                    .join(" ") || "Unnamed student"}{" "}
                  · open profile
                </Link>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <aside className="space-y-4">
        <section className="rounded-xl border border-border/60 bg-card">
          <header className="border-b border-border/60 px-5 py-3">
            <h2 className="text-sm font-semibold tracking-tight">Details</h2>
          </header>
          <dl className="divide-y divide-border/60">
            {facts.map((f) => (
              <div
                key={f.label}
                className="flex items-start justify-between gap-4 px-5 py-3"
              >
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <f.icon className="size-3.5" />
                  {f.label}
                </dt>
                <dd className="max-w-[60%] truncate text-end text-sm font-medium">
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </aside>
    </div>
  );
}
