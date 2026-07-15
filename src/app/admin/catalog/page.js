import {
  ErrorBox,
  PageHeader,
  Panel,
  SimpleTable,
} from "@/components/admin/ui";
import { getCatalogData } from "@/lib/admin/extra";

export const metadata = { title: "Katalog" };
export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  let data;
  let error;

  try {
    data = await getCatalogData();
  } catch (err) {
    error = err?.message || String(err);
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Katalog" />
        <ErrorBox error={error} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Katalog CMS"
        description="goal_options, common_sensitivity_foods, period_symptom_options"
      />

      <Panel title="Goal options">
        <SimpleTable
          columns={[
            { key: "goal_key", label: "Key" },
            { key: "goal_name", label: "Ad" },
            { key: "sort_order", label: "Sıra" },
            {
              key: "is_active",
              label: "Aktif",
              render: (row) => (row.is_active ? "Evet" : "Hayır"),
            },
          ]}
          rows={data.goalOptions}
        />
      </Panel>

      <Panel title="Sensitivity foods" className="mt-4">
        <SimpleTable
          columns={[
            { key: "emoji", label: "" },
            { key: "food_key", label: "Key" },
            { key: "food_name", label: "Ad" },
            {
              key: "keywords",
              label: "Keywords",
              render: (row) => (row.keywords || []).join(", "),
            },
            {
              key: "is_active",
              label: "Aktif",
              render: (row) => (row.is_active ? "Evet" : "Hayır"),
            },
          ]}
          rows={data.sensitivityFoods}
        />
      </Panel>

      <Panel title="Period symptom options" className="mt-4">
        <SimpleTable
          columns={[
            { key: "symptom_key", label: "Key" },
            { key: "symptom_name", label: "Ad" },
            { key: "sort_order", label: "Sıra" },
            {
              key: "is_active",
              label: "Aktif",
              render: (row) => (row.is_active ? "Evet" : "Hayır"),
            },
          ]}
          rows={data.periodSymptoms}
        />
      </Panel>
    </div>
  );
}
