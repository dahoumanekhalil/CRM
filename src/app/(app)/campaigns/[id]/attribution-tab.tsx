import { Target } from "lucide-react";
import { EmptyState } from "@/components/primitives/empty-state";
import type { CampaignAttribution } from "../actions";

interface Bucket {
  label: string;
  count: number;
}

export function AttributionTab({
  attribution,
}: {
  attribution: CampaignAttribution;
}) {
  const hasAny =
    attribution.utmSources.length > 0 ||
    attribution.utmMediums.length > 0 ||
    attribution.utmCampaigns.length > 0;

  if (!hasAny) {
    return (
      <EmptyState
        icon={Target}
        title="No attribution captured"
        description="UTM parameters aren't set on any leads attached to this campaign yet. Add `utm_source`, `utm_medium` and `utm_campaign` to your landing-page links."
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Panel title="Top UTM sources" buckets={attribution.utmSources} />
      <Panel title="Top UTM mediums" buckets={attribution.utmMediums} />
      <Panel title="Top UTM campaigns" buckets={attribution.utmCampaigns} />
    </div>
  );
}

function Panel({ title, buckets }: { title: string; buckets: Bucket[] }) {
  const total = buckets.reduce((sum, b) => sum + b.count, 0);

  return (
    <section className="overflow-hidden rounded-xl border border-border/60 bg-card">
      <header className="border-b border-border/60 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      </header>
      {buckets.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs text-muted-foreground">
          Nothing captured yet.
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {buckets.map((b) => {
            const pct = total > 0 ? (b.count / total) * 100 : 0;
            return (
              <li key={b.label} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium">{b.label}</span>
                  <span className="tabular-nums text-xs text-muted-foreground">
                    {b.count} · {pct.toFixed(0)}%
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
