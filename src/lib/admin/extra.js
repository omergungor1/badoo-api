import { createAdminClient } from "@/lib/supabase/admin";
import { daysAgoStartIso } from "@/lib/admin/time";

export async function getAiMetrics() {
  const admin = createAdminClient();
  const monthStart = daysAgoStartIso(30);

  const { data, error } = await admin
    .from("health_ai_analyses")
    .select("id, user_id, title, model, status, period_start, period_end, created_at, analysis_text")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  const rows = data || [];
  const byStatus = {};
  const byModel = {};
  let emptyText = 0;
  let longPeriod = 0;
  const monthlyByUser = {};

  for (const row of rows) {
    byStatus[row.status] = (byStatus[row.status] || 0) + 1;
    byModel[row.model || "unknown"] = (byModel[row.model || "unknown"] || 0) + 1;
    if (!row.analysis_text || !String(row.analysis_text).trim()) emptyText += 1;
    if (row.period_start && row.period_end) {
      const days =
        (new Date(row.period_end) - new Date(row.period_start)) /
        (1000 * 60 * 60 * 24);
      if (days > 90) longPeriod += 1;
    }
    if (row.created_at && row.created_at >= monthStart) {
      monthlyByUser[row.user_id] = (monthlyByUser[row.user_id] || 0) + 1;
    }
  }

  const perUserValues = Object.values(monthlyByUser);
  const avgPerUser = perUserValues.length
    ? Math.round(
        (perUserValues.reduce((a, b) => a + b, 0) / perUserValues.length) * 10,
      ) / 10
    : 0;

  return {
    recent: rows.slice(0, 30).map((r) => ({
      id: r.id,
      user_id: r.user_id,
      title: r.title,
      model: r.model,
      status: r.status,
      period_start: r.period_start,
      period_end: r.period_end,
      created_at: r.created_at,
    })),
    byStatus,
    byModel,
    emptyText,
    longPeriod,
    avgPerUserMonth: avgPerUser,
    monthlyAnalyses: perUserValues.reduce((a, b) => a + b, 0),
  };
}

export async function getNutritionMetrics() {
  const admin = createAdminClient();
  const weekStart = daysAgoStartIso(7);

  const [
    foods,
    foodLogs,
    withImage,
    calorieNull,
    recentFoods,
  ] = await Promise.all([
    admin.from("foods").select("*", { count: "exact", head: true }),
    admin
      .from("food_logs")
      .select("calories, protein, image_url")
      .is("deleted_at", null)
      .gte("timestamp", weekStart),
    admin
      .from("food_logs")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .not("image_url", "is", null)
      .gte("timestamp", weekStart),
    admin
      .from("food_logs")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .is("calories", null)
      .gte("timestamp", weekStart),
    admin
      .from("foods")
      .select("id, food_name, unit_type, calories, protein, carbohydrates, fats")
      .order("food_name")
      .limit(50),
  ]);

  const logs = foodLogs.data || [];
  const calVals = logs.map((l) => l.calories).filter((v) => v != null);
  const protVals = logs.map((l) => l.protein).filter((v) => v != null);

  return {
    foodsCount: foods.count || 0,
    weekLogs: logs.length,
    withImage: withImage.count || 0,
    calorieNull: calorieNull.count || 0,
    imageRate: logs.length ? withImage.count / logs.length : 0,
    avgCalories: calVals.length
      ? Math.round(calVals.reduce((a, b) => a + b, 0) / calVals.length)
      : null,
    avgProtein: protVals.length
      ? Math.round(protVals.reduce((a, b) => a + b, 0) / protVals.length)
      : null,
    catalogSample: recentFoods.data || [],
  };
}

export async function getCatalogData() {
  const admin = createAdminClient();
  const [goals, sensitivities, symptoms] = await Promise.all([
    admin
      .from("goal_options")
      .select("*")
      .order("sort_order", { ascending: true }),
    admin
      .from("common_sensitivity_foods")
      .select("*")
      .order("sort_order", { ascending: true }),
    admin
      .from("period_symptom_options")
      .select("*")
      .order("sort_order", { ascending: true }),
  ]);

  return {
    goalOptions: goals.data || [],
    sensitivityFoods: sensitivities.data || [],
    periodSymptoms: symptoms.data || [],
    errors: {
      goals: goals.error?.message,
      sensitivities: sensitivities.error?.message,
      symptoms: symptoms.error?.message,
    },
  };
}

export async function getDataQualityChecks() {
  const admin = createAdminClient();

  const [nullUserId, lowCal, highCal, badWater, badQty] = await Promise.all([
    admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .is("user_id", null),
    admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .not("daily_calorie_goal", "is", null)
      .lt("daily_calorie_goal", 500),
    admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gt("daily_calorie_goal", 10000),
    admin
      .from("water_logs")
      .select("*", { count: "exact", head: true })
      .or("amount.lte.0,amount.gt.5000"),
    admin
      .from("food_logs")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .lte("quantity", 0),
  ]);

  const { data: friendshipRows } = await admin
    .from("friendships")
    .select("requester_id, addressee_id");
  const selfCount = (friendshipRows || []).filter(
    (f) => f.requester_id === f.addressee_id,
  ).length;

  const { data: cycles } = await admin
    .from("period_cycles")
    .select("start_date, end_date")
    .not("end_date", "is", null)
    .limit(1000);
  const badPeriodCount = (cycles || []).filter(
    (c) => c.end_date && c.start_date && c.end_date < c.start_date,
  ).length;

  return [
    { key: "null_user_id", label: "profiles.user_id NULL", count: nullUserId.count || 0, level: "yellow" },
    { key: "low_cal", label: "Kalori hedefi < 500", count: lowCal.count || 0, level: "yellow" },
    { key: "high_cal", label: "Kalori hedefi > 10000", count: highCal.count || 0, level: "yellow" },
    { key: "bad_water", label: "Su miktarı ≤0 veya >5000", count: badWater.count || 0, level: "yellow" },
    { key: "bad_qty", label: "food_logs.quantity ≤ 0", count: badQty.count || 0, level: "yellow" },
    { key: "bad_period", label: "period end < start", count: badPeriodCount, level: "red" },
    { key: "self_friend", label: "Self-friendship", count: selfCount, level: "red" },
  ];
}
