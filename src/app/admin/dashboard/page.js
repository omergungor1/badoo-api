import {
  AlertList,
  ButtonLink,
  ErrorBox,
  MetricList,
  PageHeader,
  Panel,
  StatCard,
} from "@/components/admin/ui";
import { getDashboardMetrics, getHealthAlerts } from "@/lib/admin/metrics";
import { formatNumber, formatPercent } from "@/lib/admin/time";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const LOG_LABELS = {
  food: "Yemek",
  water: "Su",
  drink: "İçecek",
  medication: "İlaç",
  symptom: "Semptom",
  stool: "Tuvalet",
  sleep: "Uyku",
  activity: "Aktivite",
  status: "Durum",
  note: "Not",
};

export default async function DashboardPage() {
  let metrics;
  let alerts;
  let error;

  try {
    metrics = await getDashboardMetrics();
    alerts = await getHealthAlerts(metrics);
  } catch (err) {
    error = err?.message || String(err);
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Dashboard"
          description="Ürün sağlığı ve büyüme KPI’ları"
        />
        <ErrorBox error={error} />
      </div>
    );
  }

  const { users, engagement, nutrition, social, ai, push } = metrics;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Europe/Istanbul — kullanıcı, engagement ve sağlık sinyalleri"
        actions={
          <ButtonLink href="/admin/health">Health checklist</ButtonLink>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Auth kullanıcı" value={formatNumber(users.authUsers)} />
        <StatCard
          label="Profil"
          value={formatNumber(users.profiles)}
          hint={`Gap: ${formatNumber(users.authProfileGap)}`}
        />
        <StatCard
          label="Onboarded"
          value={formatNumber(users.onboarded)}
          hint={`${formatPercent(users.onboarded, users.profiles)} · yarım: ${formatNumber(users.notOnboarded)}`}
        />
        <StatCard
          label="Yeni profil (7g)"
          value={formatNumber(users.newProfiles7d)}
        />
        <StatCard
          label="DAU"
          value={formatNumber(engagement.dau)}
          hint="Bugün log yazan"
        />
        <StatCard label="WAU" value={formatNumber(engagement.wau)} />
        <StatCard label="MAU" value={formatNumber(engagement.mau)} />
        <StatCard
          label="Stickiness"
          value={`${engagement.stickiness}%`}
          hint="DAU / MAU"
        />
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-2">
        <Panel title="Health / Alerts">
          <AlertList alerts={alerts} />
        </Panel>

        <Panel
          title="Bugün log breakdown"
          action={
            <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
              {formatNumber(engagement.logsTodayTotal)} toplam
            </span>
          }
        >
          <MetricList
            items={Object.entries(engagement.logBreakdownToday).map(
              ([key, count]) => ({
                label: LOG_LABELS[key] || key,
                value: formatNumber(count),
                meta: `7g: ${formatNumber(engagement.logBreakdown7d[key])}`,
              }),
            )}
          />
        </Panel>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Sosyal">
          <MetricList
            items={[
              { label: "Pending", value: formatNumber(social.pending) },
              { label: "Accepted", value: formatNumber(social.accepted) },
              { label: "Rejected", value: formatNumber(social.rejected) },
            ]}
          />
        </Panel>

        <Panel title="Beslenme & hedefler">
          <MetricList
            items={[
              { label: "Foods katalog", value: formatNumber(nutrition.foodsCount) },
              { label: "Aktif food log", value: formatNumber(nutrition.foodActive) },
              {
                label: "Silinen food log",
                value: formatNumber(nutrition.foodDeleted),
              },
              {
                label: "Ort. kalori hedefi",
                value: nutrition.avgCalorieGoal ?? "—",
              },
            ]}
          />
        </Panel>

        <Panel title="AI & Push">
          <MetricList
            items={[
              { label: "AI analiz", value: formatNumber(ai.total) },
              { label: "AI fail", value: formatNumber(ai.failed) },
              {
                label: "Push coverage",
                value: formatPercent(push.usersWithToken, users.profiles),
              },
              {
                label: "Fotoğraflı profil",
                value: formatPercent(users.withPhoto, users.profiles),
              },
            ]}
          />
        </Panel>
      </section>
    </div>
  );
}
