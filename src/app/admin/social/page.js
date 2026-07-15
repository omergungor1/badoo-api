import {
  ErrorBox,
  PageHeader,
  Panel,
  StatCard,
} from "@/components/admin/ui";
import { getSocialMetrics } from "@/lib/admin/social";
import { formatNumber } from "@/lib/admin/time";

export const metadata = { title: "Sosyal" };
export const dynamic = "force-dynamic";

export default async function SocialPage() {
  let m;
  let error;

  try {
    m = await getSocialMetrics();
  } catch (err) {
    error = err?.message || String(err);
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Sosyal" />
        <ErrorBox error={error} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Sosyal"
        description="Friendships, nudges, notes, notifications"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending" value={formatNumber(m.status.pending)} />
        <StatCard label="Accepted" value={formatNumber(m.status.accepted)} />
        <StatCard label="Rejected" value={formatNumber(m.status.rejected)} />
        <StatCard label="Kabul oranı" value={`${m.acceptRate}%`} />
        <StatCard label="Nudge bugün" value={formatNumber(m.nudgesToday)} />
        <StatCard label="Nudge 7g" value={formatNumber(m.nudgesWeek)} />
        <StatCard label="Arkadaş notu 7g" value={formatNumber(m.notesWeek)} />
        <StatCard
          label="Süresi dolmuş okunmamış not"
          value={formatNumber(m.expiredUnread)}
        />
        <StatCard
          label="Okunmamış bildirim"
          value={formatNumber(m.unreadNotifications)}
        />
      </div>

      <Panel title="Bildirim tipleri (7g)" className="mt-6">
        <ul className="space-y-1.5 text-sm">
          {Object.entries(m.notifByType).length === 0 ? (
            <li className="text-muted">Kayıt yok</li>
          ) : (
            Object.entries(m.notifByType)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <li key={type} className="flex justify-between">
                  <span>{type}</span>
                  <span className="tabular-nums font-medium">
                    {formatNumber(count)}
                  </span>
                </li>
              ))
          )}
        </ul>
      </Panel>
    </div>
  );
}
