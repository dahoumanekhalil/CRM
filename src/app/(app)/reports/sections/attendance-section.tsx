import { format } from "date-fns";
import { CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AttendanceRow } from "../actions";

function RateBar({ rate }: { rate: number }) {
  const color =
    rate >= 80
      ? "bg-success"
      : rate >= 50
        ? "bg-amber-500"
        : "bg-destructive";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full", color)} style={{ width: `${rate}%` }} />
      </div>
      <span
        className={cn(
          "min-w-[32px] text-end text-xs tabular-nums",
          rate >= 80
            ? "text-success"
            : rate >= 50
              ? "text-amber-600"
              : "text-destructive"
        )}
      >
        {rate}%
      </span>
    </div>
  );
}

export function AttendanceSection({ rows }: { rows: AttendanceRow[] }) {
  return (
    <section className="rounded-xl border border-border/60 bg-card">
      <header className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <CalendarCheck className="size-4 text-muted-foreground" />
        <div>
          <h2 className="text-sm font-semibold tracking-tight">
            Attendance by session
          </h2>
          <p className="text-xs text-muted-foreground">
            Present ÷ enrolled · sessions starting in range
          </p>
        </div>
      </header>
      {rows.length === 0 ? (
        <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
          No sessions in this range.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 text-start">Session</th>
                <th className="px-4 py-2.5 text-start">Date</th>
                <th className="px-4 py-2.5 text-end">Enrolled</th>
                <th className="px-4 py-2.5 text-end">Present</th>
                <th className="px-4 py-2.5 text-end">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {rows.map((r) => (
                <tr key={r.sessionId} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.courseName}</div>
                    {r.city ? (
                      <div className="text-xs text-muted-foreground">
                        {r.city}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {format(new Date(r.startDate), "d MMM yyyy")}
                  </td>
                  <td className="px-4 py-3 text-end tabular-nums">
                    {r.enrolled}
                  </td>
                  <td className="px-4 py-3 text-end tabular-nums">
                    {r.present}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <RateBar rate={r.rate} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
