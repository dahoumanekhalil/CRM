import Link from "next/link";
import { Megaphone, Target } from "lucide-react";
import { EmptyState } from "@/components/primitives/empty-state";
import type { LeadDetail } from "../actions";

// Attribution surface — the data we captured to power future retargeting.
// If nothing was captured (walk-in, manual entry), show a helpful empty state.

export function AttributionTab({ lead }: { lead: LeadDetail }) {
  const rows: Array<{
    label: string;
    value: React.ReactNode | null;
    plain: string | null;
  }> = [
    { label: "Source", value: lead.source, plain: lead.source },
    {
      label: "Campaign",
      value: lead.campaign ? (
        <Link
          href={`/campaigns/${lead.campaign.id}`}
          className="hover:underline"
        >
          {lead.campaign.name}
        </Link>
      ) : null,
      plain: lead.campaign?.name ?? null,
    },
    { label: "UTM source", value: lead.utmSource, plain: lead.utmSource },
    { label: "UTM medium", value: lead.utmMedium, plain: lead.utmMedium },
    { label: "UTM campaign", value: lead.utmCampaign, plain: lead.utmCampaign },
  ];

  const hasAny = rows.some((r) => r.plain);

  if (!hasAny) {
    return (
      <EmptyState
        icon={Target}
        title="No attribution captured"
        description="This lead was created manually or via a channel that doesn't set UTM parameters."
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
      <section className="rounded-xl border border-border/60 bg-card">
        <header className="flex items-center gap-2 border-b border-border/60 px-5 py-3">
          <Megaphone className="size-4 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              Where they came from
            </h2>
            <p className="text-xs text-muted-foreground">
              Kept for retargeting — segment on any of these when running a
              future campaign.
            </p>
          </div>
        </header>
        <dl className="divide-y divide-border/60">
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex items-start justify-between gap-4 px-5 py-3"
            >
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                {r.label}
              </dt>
              <dd
                className={
                  r.plain
                    ? "text-end text-sm font-medium tabular-nums"
                    : "text-end text-sm text-muted-foreground/60"
                }
              >
                {r.value ?? "—"}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <aside className="rounded-xl border border-border/60 bg-muted/20 p-5 text-sm">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Target className="size-3.5" /> Consent
        </div>
        <p className="mt-2 text-sm">
          {lead.subscribed
            ? "Opted in — safe to include in marketing campaigns."
            : "Opted out — do NOT include in marketing sends."}
        </p>
      </aside>
    </div>
  );
}
