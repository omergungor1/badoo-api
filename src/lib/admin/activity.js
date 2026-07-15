import { createAdminClient } from "@/lib/supabase/admin";
import {
  daysAgoStartIso,
  istanbulDayEndExclusiveIso,
  istanbulDayStartIso,
} from "@/lib/admin/time";
import { LOG_SOURCES } from "@/lib/admin/metrics";

export async function getActivitySeries(days = 14) {
  const admin = createAdminClient();
  const since = daysAgoStartIso(days);
  const series = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const start = istanbulDayStartIso(d);
    const end = istanbulDayEndExclusiveIso(d);
    const dayLabel = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Istanbul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);

    const counts = {};
    await Promise.all(
      LOG_SOURCES.map(async (src) => {
        let q = admin
          .from(src.table)
          .select("*", { count: "exact", head: true })
          .gte(src.timeCol, start)
          .lt(src.timeCol, end);
        if (src.softDelete) q = q.is("deleted_at", null);
        const { count, error } = await q;
        if (error) throw error;
        counts[src.key] = count || 0;
      }),
    );

    series.push({
      day: dayLabel,
      ...counts,
      total: Object.values(counts).reduce((a, b) => a + b, 0),
    });
  }

  return series;
}

export async function getActivitySourceBreakdown() {
  const admin = createAdminClient();
  const since = daysAgoStartIso(30);
  const { data, error } = await admin
    .from("activity_logs")
    .select("source")
    .gte("timestamp", since);
  if (error) throw error;

  const breakdown = {};
  for (const row of data || []) {
    const s = row.source || "unknown";
    breakdown[s] = (breakdown[s] || 0) + 1;
  }
  return breakdown;
}
