import {
  ErrorBox,
  PageHeader,
  Panel,
  SimpleTable,
  StatCard,
} from "@/components/admin/ui";
import {
  getActivitySeries,
  getActivitySourceBreakdown,
} from "@/lib/admin/activity";
import { formatNumber } from "@/lib/admin/time";

export const metadata = { title: "Aktivite" };
export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  let series;
  let sources;
  let error;

  try {
    [series, sources] = await Promise.all([
      getActivitySeries(14),
      getActivitySourceBreakdown(),
    ]);
  } catch (err) {
    error = err?.message || String(err);
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Aktivite" />
        <ErrorBox error={error} />
      </div>
    );
  }

  const maxTotal = Math.max(...series.map((d) => d.total), 1);

  return (
    <div>
      <PageHeader
        title="Aktivite"
        description="Son 14 gün log zaman serisi (Europe/Istanbul)"
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="14g toplam log"
          value={formatNumber(series.reduce((a, d) => a + d.total, 0))}
        />
        <StatCard
          label="Bugün"
          value={formatNumber(series[series.length - 1]?.total || 0)}
        />
        <StatCard
          label="Apple Health (30g)"
          value={formatNumber(sources.apple_health || 0)}
          hint={`manual: ${formatNumber(sources.manual || 0)}`}
        />
      </div>

      <Panel title="Günlük toplam (spark bars)">
        <div className="flex h-40 items-end gap-1">
          {series.map((d) => (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t-md bg-accent/90"
                style={{ height: `${Math.max(4, (d.total / maxTotal) * 100)}%` }}
                title={`${d.day}: ${d.total}`}
              />
              <span className="text-[9px] text-subtle">
                {d.day.slice(5)}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Günlük detay" className="mt-4">
        <SimpleTable
          columns={[
            { key: "day", label: "Gün" },
            { key: "food", label: "Yemek" },
            { key: "water", label: "Su" },
            { key: "activity", label: "Aktivite" },
            { key: "symptom", label: "Semptom" },
            { key: "sleep", label: "Uyku" },
            { key: "total", label: "Toplam" },
          ]}
          rows={series.slice().reverse()}
        />
      </Panel>
    </div>
  );
}
