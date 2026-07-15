import {
  AlertList,
  ErrorBox,
  PageHeader,
  Panel,
  SimpleTable,
} from "@/components/admin/ui";
import { getHealthAlerts } from "@/lib/admin/metrics";
import { getDataQualityChecks } from "@/lib/admin/extra";
import { formatNumber } from "@/lib/admin/time";

export const metadata = { title: "Sağlık" };
export const dynamic = "force-dynamic";

export default async function HealthPage() {
  let alerts;
  let checks;
  let error;

  try {
    [alerts, checks] = await Promise.all([
      getHealthAlerts(),
      getDataQualityChecks(),
    ]);
  } catch (err) {
    error = err?.message || String(err);
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Sağlık & anomali" />
        <ErrorBox error={error} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Sağlık & anomali"
        description="Sistem sağlığı checklist + veri kalitesi"
      />

      <Panel title="Sistem alerts">
        <AlertList alerts={alerts} />
      </Panel>

      <Panel title="Veri kalitesi" className="mt-4">
        <SimpleTable
          columns={[
            { key: "label", label: "Kontrol" },
            {
              key: "count",
              label: "Adet",
              render: (row) => formatNumber(row.count),
            },
            {
              key: "level",
              label: "Seviye",
              render: (row) => (
                <span
                  className={
                    row.count > 0 && row.level === "red"
                      ? "text-red-700"
                      : row.count > 0
                        ? "text-amber-700"
                        : "text-emerald-700"
                  }
                >
                  {row.count > 0 ? row.level : "ok"}
                </span>
              ),
            },
          ]}
          rows={checks}
        />
      </Panel>
    </div>
  );
}
