import { Users } from "lucide-react";
import type { SalesRepRow } from "../actions";

function convRate(conv: number, leads: number): string {
  if (leads === 0) return "—";
  return `${Math.round((conv / leads) * 100)}%`;
}

export function SalesRepSection({ rows }: { rows: SalesRepRow[] }) {
  return (
    <section className="rounded-xl border border-border/60 bg-card">
      <header className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <Users className="size-4 text-muted-foreground" />
        <div>
          <h2 className="text-sm font-semibold tracking-tight">
            Sales performance
          </h2>
          <p className="text-xs text-muted-foreground">
            Leads, conversions and registrations per rep · this range
          </p>
        </div>
      </header>
      {rows.length === 0 ? (
        <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
          No leads with an assigned owner in this range.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 text-start">Rep</th>
                <th className="px-4 py-2.5 text-end">Leads</th>
                <th className="px-4 py-2.5 text-end">Conversions</th>
                <th className="px-4 py-2.5 text-end">Conv. rate</th>
                <th className="px-4 py-2.5 text-end">Registrations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {rows.map((r) => (
                <tr key={r.userId} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                  </td>
                  <td className="px-4 py-3 text-end tabular-nums">
                    {r.leadsInRange}
                  </td>
                  <td className="px-4 py-3 text-end tabular-nums">
                    {r.conversions}
                  </td>
                  <td className="px-4 py-3 text-end tabular-nums text-muted-foreground">
                    {convRate(r.conversions, r.leadsInRange)}
                  </td>
                  <td className="px-4 py-3 text-end tabular-nums">
                    {r.registrations}
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
