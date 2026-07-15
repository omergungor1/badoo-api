import { createAdminClient } from "@/lib/supabase/admin";
import {
  daysAgoStartIso,
  istanbulDayEndExclusiveIso,
  istanbulDayStartIso,
} from "@/lib/admin/time";

export const LOG_SOURCES = [
  { key: "food", table: "food_logs", timeCol: "timestamp", softDelete: true },
  { key: "water", table: "water_logs", timeCol: "timestamp" },
  { key: "drink", table: "drink_logs", timeCol: "timestamp" },
  { key: "medication", table: "medication_logs", timeCol: "timestamp" },
  { key: "symptom", table: "symptom_logs", timeCol: "timestamp" },
  { key: "stool", table: "stool_logs", timeCol: "time" },
  { key: "sleep", table: "sleep_logs", timeCol: "timestamp" },
  { key: "activity", table: "activity_logs", timeCol: "timestamp" },
  { key: "status", table: "daily_status_logs", timeCol: "timestamp" },
  { key: "note", table: "notes", timeCol: "timestamp" },
];

async function countRows(admin, table, filters = {}) {
  let q = admin.from(table).select("*", { count: "exact", head: true });

  if (filters.softDelete) {
    q = q.is("deleted_at", null);
  }
  if (filters.eq) {
    for (const [col, val] of Object.entries(filters.eq)) {
      q = q.eq(col, val);
    }
  }
  if (filters.gte) {
    for (const [col, val] of Object.entries(filters.gte)) {
      q = q.gte(col, val);
    }
  }
  if (filters.lt) {
    for (const [col, val] of Object.entries(filters.lt)) {
      q = q.lt(col, val);
    }
  }
  if (filters.notNull) {
    for (const col of filters.notNull) {
      q = q.not(col, "is", null);
    }
  }
  if (filters.isNull) {
    for (const col of filters.isNull) {
      q = q.is(col, null);
    }
  }
  if (filters.is) {
    for (const [col, val] of Object.entries(filters.is)) {
      q = q.is(col, val);
    }
  }

  const { count, error } = await q;
  if (error) throw error;
  return count || 0;
}

async function distinctUserIdsInRange(admin, table, timeCol, sinceIso, untilIso, softDelete) {
  const ids = new Set();
  const pageSize = 1000;
  let from = 0;

  while (true) {
    let q = admin.from(table).select("user_id").range(from, from + pageSize - 1);
    if (softDelete) q = q.is("deleted_at", null);
    if (sinceIso) q = q.gte(timeCol, sinceIso);
    if (untilIso) q = q.lt(timeCol, untilIso);

    const { data, error } = await q;
    if (error) throw error;
    const rows = data || [];
    for (const row of rows) {
      if (row.user_id) ids.add(row.user_id);
    }
    if (rows.length < pageSize) break;
    from += pageSize;
    if (from > 50000) break;
  }

  return ids;
}

export async function getActiveUserSet(sinceIso, untilIso) {
  const admin = createAdminClient();
  const sets = await Promise.all(
    LOG_SOURCES.map((src) =>
      distinctUserIdsInRange(
        admin,
        src.table,
        src.timeCol,
        sinceIso,
        untilIso,
        src.softDelete,
      ),
    ),
  );

  const merged = new Set();
  for (const s of sets) {
    for (const id of s) merged.add(id);
  }
  return merged;
}

export async function countAuthUsers(admin) {
  let total = 0;
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users || [];
    total += users.length;
    if (users.length < perPage) break;
    page += 1;
    if (page > 50) break;
  }

  return total;
}

export async function getDashboardMetrics() {
  const admin = createAdminClient();
  const todayStart = istanbulDayStartIso();
  const todayEnd = istanbulDayEndExclusiveIso();
  const wauStart = daysAgoStartIso(7);
  const mauStart = daysAgoStartIso(30);
  const weekStart = daysAgoStartIso(7);

  const [
    authUsers,
    profiles,
    onboarded,
    notOnboarded,
    withPhoto,
    withCalorieGoal,
    withProteinGoal,
    withWaterGoal,
    nullUserId,
    foodsCount,
    foodActive,
    foodDeleted,
    aiTotal,
    aiFailedResult,
    friendships,
    pushTokens,
  ] = await Promise.all([
    countAuthUsers(admin),
    countRows(admin, "profiles"),
    countRows(admin, "profiles", { eq: { onboarding_completed: true } }),
    countRows(admin, "profiles", { eq: { onboarding_completed: false } }),
    countRows(admin, "profiles", { notNull: ["profile_image_url"] }),
    countRows(admin, "profiles", { notNull: ["daily_calorie_goal"] }),
    countRows(admin, "profiles", { notNull: ["daily_protein_goal"] }),
    countRows(admin, "profiles", { notNull: ["daily_water_goal"] }),
    countRows(admin, "profiles", { isNull: ["user_id"] }),
    countRows(admin, "foods"),
    countRows(admin, "food_logs", { softDelete: true }),
    countRows(admin, "food_logs", { notNull: ["deleted_at"] }),
    countRows(admin, "health_ai_analyses"),
    admin
      .from("health_ai_analyses")
      .select("*", { count: "exact", head: true })
      .neq("status", "completed"),
    admin.from("friendships").select("status"),
    admin.from("device_push_tokens").select("user_id, platform"),
  ]);

  if (aiFailedResult.error) throw aiFailedResult.error;
  const aiFailed = aiFailedResult.count || 0;

  const logBreakdownToday = {};
  const logBreakdown7d = {};
  await Promise.all(
    LOG_SOURCES.map(async (src) => {
      const [today, week] = await Promise.all([
        countRows(admin, src.table, {
          softDelete: src.softDelete,
          gte: { [src.timeCol]: todayStart },
          lt: { [src.timeCol]: todayEnd },
        }),
        countRows(admin, src.table, {
          softDelete: src.softDelete,
          gte: { [src.timeCol]: weekStart },
        }),
      ]);
      logBreakdownToday[src.key] = today;
      logBreakdown7d[src.key] = week;
    }),
  );

  const [dauSet, wauSet, mauSet] = await Promise.all([
    getActiveUserSet(todayStart, todayEnd),
    getActiveUserSet(wauStart, null),
    getActiveUserSet(mauStart, null),
  ]);

  const friendshipStatus = { pending: 0, accepted: 0, rejected: 0 };
  for (const row of friendships.data || []) {
    if (friendshipStatus[row.status] != null) friendshipStatus[row.status] += 1;
  }

  const pushUsers = new Set(
    (pushTokens.data || []).map((r) => r.user_id).filter(Boolean),
  );
  const platformBreakdown = {};
  for (const row of pushTokens.data || []) {
    const p = row.platform || "unknown";
    platformBreakdown[p] = (platformBreakdown[p] || 0) + 1;
  }

  const dau = dauSet.size;
  const wau = wauSet.size;
  const mau = mauSet.size;
  const stickiness = mau ? Math.round((dau / mau) * 1000) / 10 : 0;

  const newProfiles7d = await countRows(admin, "profiles", {
    gte: { created_at: weekStart },
  });

  const avgGoals = await admin
    .from("profiles")
    .select("daily_calorie_goal, daily_protein_goal, daily_water_goal");

  const goals = avgGoals.data || [];
  const avg = (field) => {
    const vals = goals.map((g) => g[field]).filter((v) => v != null);
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  };

  return {
    users: {
      authUsers,
      profiles,
      onboarded,
      notOnboarded,
      withPhoto,
      photoRate: profiles ? withPhoto / profiles : 0,
      newProfiles7d,
      nullUserId,
      authProfileGap: Math.max(authUsers - profiles, 0),
    },
    engagement: {
      dau,
      wau,
      mau,
      stickiness,
      logBreakdownToday,
      logBreakdown7d,
      logsTodayTotal: Object.values(logBreakdownToday).reduce((a, b) => a + b, 0),
    },
    nutrition: {
      foodsCount,
      foodActive,
      foodDeleted,
      withCalorieGoal,
      withProteinGoal,
      withWaterGoal,
      avgCalorieGoal: avg("daily_calorie_goal"),
      avgProteinGoal: avg("daily_protein_goal"),
      avgWaterGoal: avg("daily_water_goal"),
    },
    social: {
      friendshipStatus,
      accepted: friendshipStatus.accepted,
      pending: friendshipStatus.pending,
      rejected: friendshipStatus.rejected,
    },
    ai: {
      total: aiTotal,
      failed: aiFailed,
    },
    push: {
      tokenRows: (pushTokens.data || []).length,
      usersWithToken: pushUsers.size,
      platformBreakdown,
      coverage: profiles ? pushUsers.size / profiles : 0,
    },
  };
}

export async function getHealthAlerts(metrics = null) {
  const m = metrics || (await getDashboardMetrics());
  const alerts = [];

  if (m.users.authProfileGap > 5) {
    alerts.push({
      level: "red",
      title: "Auth–profil boşluğu",
      detail: `${m.users.authUsers} auth kullanıcısı, ${m.users.profiles} profil (gap: ${m.users.authProfileGap}).`,
    });
  }

  if (m.users.profiles > 0 && m.users.notOnboarded / m.users.profiles > 0.4) {
    alerts.push({
      level: "yellow",
      title: "Onboarding takılı",
      detail: `Profililerin %${Math.round((m.users.notOnboarded / m.users.profiles) * 100)}’i onboarding tamamlamamış.`,
    });
  }

  if (m.engagement.mau > 0 && m.engagement.dau === 0) {
    alerts.push({
      level: "red",
      title: "Bugün 0 log",
      detail: "MAU varken bugün hiç aktif kullanıcı yok — API / schema / client kesintisi olabilir.",
    });
  }

  if (m.ai.total > 0 && m.ai.failed / m.ai.total > 0.1) {
    alerts.push({
      level: "yellow",
      title: "AI fail oranı yüksek",
      detail: `${m.ai.failed} / ${m.ai.total} analiz completed değil.`,
    });
  }

  if (m.users.profiles > 10 && m.push.coverage < 0.3) {
    alerts.push({
      level: "yellow",
      title: "Push coverage düşük",
      detail: `Profililerin yalnızca %${Math.round(m.push.coverage * 100)}’inde token var.`,
    });
  }

  if (m.users.nullUserId > 0) {
    alerts.push({
      level: "yellow",
      title: "user_id NULL profil",
      detail: `${m.users.nullUserId} profilde user_id boş.`,
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      level: "green",
      title: "Kritik anomali yok",
      detail: "Kontrol edilen sağlık sinyalleri şu an normal görünüyor.",
    });
  }

  return alerts;
}
