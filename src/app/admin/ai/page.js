import {
  ErrorBox,
  PageHeader,
  Panel,
  SimpleTable,
  StatCard,
} from "@/components/admin/ui";
import { getAiMetrics } from "@/lib/admin/extra";
import { formatNumber } from "@/lib/admin/time";

export const metadata = { title: "AI" };
export const dynamic = "force-dynamic";

export default async function AiPage() {
  let m;
  let error;

  try {
    m = await getAiMetrics();
  } catch (err) {
    error = err?.message || String(err);
  }

  if (error) {
    return (
      <div>
        <PageHeader title="AI" />
        <ErrorBox error={error} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Health AI"
        description="health_ai_analyses — maliyet proxy metrikleri"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Son 30g analiz"
          value={formatNumber(m.monthlyAnalyses)}
        />
        <StatCard
          label="Ort. / kullanıcı / ay"
          value={formatNumber(m.avgPerUserMonth)}
        />
        <StatCard label="Boş analysis_text" value={formatNumber(m.emptyText)} />
        <StatCard
          label="Uzun dönem (>90g)"
          value={formatNumber(m.longPeriod)}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Status dağılımı">
          <ul className="space-y-1.5 text-sm">
            {Object.entries(m.byStatus).map(([k, v]) => (
              <li key={k} className="flex justify-between">
                <span>{k}</span>
                <span className="tabular-nums font-medium">{formatNumber(v)}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Model dağılımı">
          <ul className="space-y-1.5 text-sm">
            {Object.entries(m.byModel).map(([k, v]) => (
              <li key={k} className="flex justify-between">
                <span>{k}</span>
                <span className="tabular-nums font-medium">{formatNumber(v)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Son analizler" className="mt-4">
        <SimpleTable
          columns={[
            { key: "title", label: "Başlık" },
            { key: "status", label: "Status" },
            { key: "model", label: "Model" },
            {
              key: "period",
              label: "Dönem",
              render: (row) => `${row.period_start} → ${row.period_end}`,
            },
            {
              key: "user_id",
              label: "User",
              render: (row) => (
                <a
                  href={`/admin/users/${row.user_id}`}
                  className="underline-offset-2 hover:underline"
                >
                  {String(row.user_id).slice(0, 8)}…
                </a>
              ),
            },
          ]}
          rows={m.recent}
        />
      </Panel>
    </div>
  );
}
