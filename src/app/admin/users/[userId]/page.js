import {
  ButtonLink,
  ErrorBox,
  PageHeader,
  Panel,
  SimpleTable,
  StatCard,
} from "@/components/admin/ui";
import { getUserDetail } from "@/lib/admin/users";
import { formatNumber } from "@/lib/admin/time";

export const metadata = { title: "Kullanıcı detay" };
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

export default async function UserDetailPage({ params }) {
  const { userId } = await params;
  let detail;
  let error;

  try {
    detail = await getUserDetail(userId);
  } catch (err) {
    error = err?.message || String(err);
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Kullanıcı detay" />
        <ErrorBox error={error} />
      </div>
    );
  }

  const p = detail.profile;

  return (
    <div>
      <PageHeader
        title={p?.nickname || detail.authUser?.email || "Kullanıcı"}
        description={userId}
        actions={<ButtonLink href="/admin/users">Listeye dön</ButtonLink>}
      />

      {!p ? (
        <p className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm">
          Bu user_id için `badoo.profiles` kaydı bulunamadı.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="E-posta"
          value={detail.authUser?.email || "—"}
        />
        <StatCard
          label="Onboarding"
          value={p?.onboarding_completed ? "Tamam" : "Eksik"}
        />
        <StatCard
          label="Push token"
          value={formatNumber(detail.tokens.length)}
        />
        <StatCard
          label="Okunmamış bildiriş"
          value={formatNumber(detail.unreadNotifications)}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Profil">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Cinsiyet", p?.gender],
              ["Doğum yılı", p?.birth_year],
              ["Boy", p?.height],
              ["Kilo", p?.weight],
              ["Kalori hedefi", p?.daily_calorie_goal],
              ["Protein hedefi", p?.daily_protein_goal],
              ["Su hedefi", p?.daily_water_goal],
              ["Aktivite hedefi", p?.daily_activity_goal],
              [
                "Kayıt",
                p?.created_at
                  ? new Date(p.created_at).toLocaleString("tr-TR")
                  : "—",
              ],
              [
                "Güncelleme",
                p?.updated_at
                  ? new Date(p.updated_at).toLocaleString("tr-TR")
                  : "—",
              ],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-subtle">{k}</dt>
                <dd className="mt-0.5 font-medium">{v ?? "—"}</dd>
              </div>
            ))}
          </dl>
          {p?.bio ? (
            <p className="mt-4 text-sm text-muted">{p.bio}</p>
          ) : null}
        </Panel>

        <Panel title="Son 14 gün log özeti">
          <ul className="space-y-1.5 text-sm">
            {Object.entries(detail.logSummary).map(([key, count]) => (
              <li key={key} className="flex justify-between">
                <span>{LOG_LABELS[key] || key}</span>
                <span className="tabular-nums font-medium">
                  {formatNumber(count)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Conditions">
          <ul className="space-y-1 text-sm">
            {detail.conditions.length === 0 ? (
              <li className="text-muted">Yok</li>
            ) : (
              detail.conditions.map((c) => (
                <li key={c.id}>{c.condition_name}</li>
              ))
            )}
          </ul>
        </Panel>
        <Panel title="Hassasiyetler">
          <ul className="space-y-1 text-sm">
            {detail.sensitivities.length === 0 ? (
              <li className="text-muted">Yok</li>
            ) : (
              detail.sensitivities.map((c) => (
                <li key={c.id}>{c.sensitivity_name}</li>
              ))
            )}
          </ul>
        </Panel>
        <Panel title="İlaçlar">
          <ul className="space-y-1 text-sm">
            {detail.medications.length === 0 ? (
              <li className="text-muted">Yok</li>
            ) : (
              detail.medications.map((c) => (
                <li key={c.id}>{c.medication_name}</li>
              ))
            )}
          </ul>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Arkadaşlıklar">
          <SimpleTable
            columns={[
              { key: "direction", label: "Yön" },
              { key: "status", label: "Status" },
              {
                key: "peer",
                label: "Karşı taraf",
                render: (row) =>
                  row.direction === "sent" ? row.addressee_id : row.requester_id,
              },
            ]}
            rows={detail.friendships}
          />
        </Panel>
        <Panel title="Push tokens">
          <SimpleTable
            columns={[
              { key: "platform", label: "Platform" },
              {
                key: "updated_at",
                label: "Güncelleme",
                render: (row) =>
                  row.updated_at
                    ? new Date(row.updated_at).toLocaleString("tr-TR")
                    : "—",
              },
            ]}
            rows={detail.tokens}
          />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Son nudges">
          <SimpleTable
            columns={[
              { key: "sender_id", label: "Gönderen" },
              { key: "receiver_id", label: "Alan" },
              {
                key: "created_at",
                label: "Zaman",
                render: (row) =>
                  new Date(row.created_at).toLocaleString("tr-TR"),
              },
            ]}
            rows={detail.nudges}
          />
        </Panel>
        <Panel title="Bildirimler">
          <SimpleTable
            columns={[
              { key: "type", label: "Tip" },
              { key: "title", label: "Başlık" },
              {
                key: "read_at",
                label: "Okundu",
                render: (row) => (row.read_at ? "Evet" : "Hayır"),
              },
            ]}
            rows={detail.notifications}
          />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="AI analizler">
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
            ]}
            rows={detail.aiAnalyses}
          />
        </Panel>
        <Panel title="Adet (period)">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-subtle">
            Cycles
          </p>
          <SimpleTable
            columns={[
              { key: "start_date", label: "Başlangıç" },
              { key: "end_date", label: "Bitiş" },
            ]}
            rows={detail.periodCycles}
          />
          <p className="mb-3 mt-4 text-xs font-semibold uppercase tracking-[0.1em] text-subtle">
            Son loglar
          </p>
          <SimpleTable
            columns={[
              { key: "log_type", label: "Tip" },
              { key: "symptom_name", label: "Semptom" },
              { key: "flow_level", label: "Flow" },
              {
                key: "logged_at",
                label: "Zaman",
                render: (row) =>
                  row.logged_at
                    ? new Date(row.logged_at).toLocaleString("tr-TR")
                    : "—",
              },
            ]}
            rows={detail.periodLogs}
          />
        </Panel>
      </div>
    </div>
  );
}
