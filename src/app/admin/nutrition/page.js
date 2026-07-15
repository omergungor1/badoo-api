import {
  ErrorBox,
  PageHeader,
  Panel,
  SimpleTable,
  StatCard,
} from "@/components/admin/ui";
import { getNutritionMetrics } from "@/lib/admin/extra";
import { formatNumber, formatPercent } from "@/lib/admin/time";

export const metadata = { title: "Beslenme" };
export const dynamic = "force-dynamic";

export default async function NutritionPage() {
  let m;
  let error;

  try {
    m = await getNutritionMetrics();
  } catch (err) {
    error = err?.message || String(err);
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Beslenme" />
        <ErrorBox error={error} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Beslenme"
        description="Foods katalog ve food_logs özeti (7g)"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Katalog foods" value={formatNumber(m.foodsCount)} />
        <StatCard label="Food log (7g)" value={formatNumber(m.weekLogs)} />
        <StatCard
          label="Fotoğraflı oran"
          value={formatPercent(m.withImage, m.weekLogs)}
        />
        <StatCard
          label="Kalori null (7g)"
          value={formatNumber(m.calorieNull)}
          hint="Nutrition AI / lookup şüphesi"
        />
        <StatCard
          label="Ort. öğün kalori"
          value={m.avgCalories ?? "—"}
        />
        <StatCard label="Ort. protein" value={m.avgProtein ?? "—"} />
      </div>

      <Panel title="Foods katalog (örnek)" className="mt-6">
        <SimpleTable
          columns={[
            { key: "food_name", label: "Yiyecek" },
            { key: "unit_type", label: "Birim" },
            { key: "calories", label: "kcal" },
            { key: "protein", label: "Protein" },
            { key: "carbohydrates", label: "Karb" },
            { key: "fats", label: "Yağ" },
          ]}
          rows={m.catalogSample}
        />
      </Panel>
    </div>
  );
}
