import {
  Calendar,
  CalendarCheck2,
  ClipboardList,
  DollarSign,
  Mail,
  MessagesSquare,
  Phone,
  TrendingUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { prisma } from "@/lib/prisma";
import type { StudentDetail } from "../actions";
import { StudentNextActionSection } from "./next-action-section";

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

export async function OverviewTab({ student }: { student: StudentDetail }) {
  const [paymentGroups, coursesEnrolled, totalAttendance, attendedCount, pendingPayments, users] =
    await Promise.all([
      // Completed payments by currency
      prisma.payment.groupBy({
        by: ["currency"],
        where: { studentId: student.id, status: "COMPLETED" },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
      }),
      // Distinct courses enrolled
      prisma.course.count({
        where: {
          sessions: {
            some: { registrations: { some: { studentId: student.id } } },
          },
        },
      }),
      // Total attendance records
      prisma.attendance.count({
        where: { registration: { studentId: student.id } },
      }),
      // Attended (PRESENT or LATE)
      prisma.attendance.count({
        where: {
          registration: { studentId: student.id },
          status: { in: ["PRESENT", "LATE"] },
        },
      }),
      // Pending payment count
      prisma.payment.count({
        where: { studentId: student.id, status: "PENDING" },
      }),
      // Users for assignee picker
      prisma.user.findMany({
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      }),
    ]);

  // Total paid — top currency
  const topGroup = paymentGroups[0];
  const totalPaidLabel = topGroup
    ? formatCurrency(Number(topGroup._sum.amount ?? 0), topGroup.currency) +
      (paymentGroups.length > 1 ? "+" : "")
    : "—";

  const attendanceRate =
    totalAttendance > 0
      ? `${Math.round((attendedCount / totalAttendance) * 100)}%`
      : "—";

  const stats = [
    {
      label: "Total paid",
      value: totalPaidLabel,
      subtext:
        pendingPayments > 0
          ? `${pendingPayments} pending`
          : topGroup
            ? "completed"
            : "no payments",
      icon: DollarSign,
      accent: pendingPayments > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
    },
    {
      label: "Courses enrolled",
      value: String(coursesEnrolled),
      subtext: `${student._count.registrations} ${student._count.registrations === 1 ? "registration" : "registrations"} total`,
      icon: ClipboardList,
      accent: "text-muted-foreground",
    },
    {
      label: "Attendance rate",
      value: attendanceRate,
      subtext:
        totalAttendance > 0
          ? `${attendedCount} / ${totalAttendance} sessions`
          : "no attendance recorded",
      icon: CalendarCheck2,
      accent:
        totalAttendance === 0
          ? "text-muted-foreground"
          : attendedCount / totalAttendance >= 0.75
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Communications",
      value: String(student._count.communications),
      subtext: student._count.communications === 0 ? "none logged" : "logged",
      icon: MessagesSquare,
      accent: "text-muted-foreground",
    },
  ];

  const facts: Array<{ label: string; value: string; icon: typeof Mail }> = [
    { label: "Email", value: student.email ?? "—", icon: Mail },
    { label: "Phone", value: student.phone ?? "—", icon: Phone },
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
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left / main */}
      <div className="space-y-4 lg:col-span-2">
        {/* 4-stat aggregate row */}
        <section
          aria-label="Overview stats"
          className="grid grid-cols-2 divide-x divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card md:grid-cols-4 md:divide-y-0"
        >
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col gap-1 px-4 py-4 md:px-5">
              <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <s.icon className="size-3.5" /> {s.label}
              </span>
              <span className="text-2xl font-semibold tabular-nums">
                {s.value}
              </span>
              <span className={`text-xs ${s.accent}`}>{s.subtext}</span>
            </div>
          ))}
        </section>

        {/* Next action — what should happen next */}
        <StudentNextActionSection student={student} users={users} />

        {/* Notes */}
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

      {/* Right / contact */}
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

        {student.tags.length > 0 ? (
          <section className="rounded-xl border border-border/60 bg-card p-5">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Tags
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {student.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          </section>
        ) : null}
      </aside>
    </div>
  );
}
