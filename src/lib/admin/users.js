import { createAdminClient } from "@/lib/supabase/admin";
import { daysAgoStartIso } from "@/lib/admin/time";
import { LOG_SOURCES } from "@/lib/admin/metrics";

export async function listUsers({ q = "", page = 1, pageSize = 25 } = {}) {
  const admin = createAdminClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = admin
    .from("profiles")
    .select(
      "id, user_id, nickname, bio, profile_image_url, birth_year, gender, height, weight, daily_calorie_goal, daily_protein_goal, daily_water_goal, daily_activity_goal, onboarding_completed, created_at, updated_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (q) {
    query = query.ilike("nickname", `%${q}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    users: data || [],
    total: count || 0,
    page,
    pageSize,
  };
}

export async function getUserDetail(userId) {
  const admin = createAdminClient();
  const since14 = daysAgoStartIso(14);

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) throw profileError;

  let authUser = null;
  try {
    const { data } = await admin.auth.admin.getUserById(userId);
    authUser = data?.user || null;
  } catch {
    authUser = null;
  }

  const [
    conditions,
    sensitivities,
    medications,
    friendshipsReq,
    friendshipsAdd,
    nudges,
    notes,
    notifications,
    tokens,
    aiAnalyses,
    periodCycles,
    periodLogs,
    logCounts,
  ] = await Promise.all([
    admin
      .from("conditions")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null),
    admin
      .from("food_sensitivities")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null),
    admin
      .from("medications")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null),
    admin.from("friendships").select("*").eq("requester_id", userId),
    admin.from("friendships").select("*").eq("addressee_id", userId),
    admin
      .from("friend_nudges")
      .select("*")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("friend_notes")
      .select("id, sender_id, receiver_id, duration_hours, expires_at, read_at, created_at")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("notifications")
      .select("id, type, title, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("device_push_tokens")
      .select("id, platform, created_at, updated_at")
      .eq("user_id", userId),
    admin
      .from("health_ai_analyses")
      .select("id, title, summary, period_start, period_end, model, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("period_cycles")
      .select("*")
      .eq("user_id", userId)
      .order("start_date", { ascending: false })
      .limit(5),
    admin
      .from("period_logs")
      .select("id, log_type, symptom_name, flow_level, logged_at")
      .eq("user_id", userId)
      .order("logged_at", { ascending: false })
      .limit(15),
    Promise.all(
      LOG_SOURCES.map(async (src) => {
        let q = admin
          .from(src.table)
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte(src.timeCol, since14);
        if (src.softDelete) q = q.is("deleted_at", null);
        const { count, error } = await q;
        if (error) throw error;
        return [src.key, count || 0];
      }),
    ),
  ]);

  const logSummary = Object.fromEntries(logCounts);

  return {
    profile,
    authUser: authUser
      ? {
          id: authUser.id,
          email: authUser.email,
          created_at: authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at,
        }
      : null,
    conditions: conditions.data || [],
    sensitivities: sensitivities.data || [],
    medications: medications.data || [],
    friendships: [
      ...(friendshipsReq.data || []).map((f) => ({ ...f, direction: "sent" })),
      ...(friendshipsAdd.data || []).map((f) => ({ ...f, direction: "received" })),
    ],
    nudges: nudges.data || [],
    friendNotes: notes.data || [],
    notifications: notifications.data || [],
    unreadNotifications: (notifications.data || []).filter((n) => !n.read_at)
      .length,
    tokens: tokens.data || [],
    aiAnalyses: aiAnalyses.data || [],
    periodCycles: periodCycles.data || [],
    periodLogs: periodLogs.data || [],
    logSummary,
  };
}
