import {
  Calendar,
  ClipboardList,
  Mail,
  MessageSquare,
  Phone,
  Wallet,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { StudentDetail } from "../actions";

export function OverviewTab({ student }: { student: StudentDetail }) {
  const metrics = [
    {
      label: "Registrations",
      value: student._count.registrations,
      icon: ClipboardList,
    },
    {
      label: "Payments",
      value: student._count.payments,
      icon: Wallet,
    },
    {
      label: "Communications",
      value: student._count.communications,
      icon: MessageSquare,
    },
  ];

  const facts: Array<{ label: string; value: string; icon: typeof Mail }> = [
    {
      label: "Email",
      value: student.email ?? "—",
      icon: Mail,
    },
    {
      label: "Phone",
      value: student.phone ?? "—",
      icon: Phone,
    },
    {
      label: "Date of birth",
      value: student.dateOfBirth
        ? student.dateOfBirth.toISOString().slice(0, 10)
        : "—",
      icon: Calendar,
    },
    {
      label: "Added",
      value: formatDistanceToNow(student.createdAt, { addSuffix: true }),
      icon: Calendar,
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <section
          aria-label="Metrics"
          className="grid grid-cols-3 divide-x divide-border/60 rounded-xl border border-border/60 bg-card"
        >
          {metrics.map((m) => (
            <div key={m.label} className="flex flex-col gap-1.5 px-5 py-4">
              <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <m.icon className="size-3.5" /> {m.label}
              </span>
              <span className="text-2xl font-semibold tabular-nums">
                {m.value}
              </span>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-border/60 bg-card p-6">
          <h2 className="mb-3 text-sm font-semibold tracking-tight">Notes</h2>
          {student.notes ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {student.notes}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No notes yet. Add context from the Edit sheet.
            </p>
          )}
        </section>
      </div>

      <aside className="space-y-4">
        <section className="rounded-xl border border-border/60 bg-card">
          <header className="border-b border-border/60 px-5 py-3">
            <h2 className="text-sm font-semibold tracking-tight">Contact</h2>
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
