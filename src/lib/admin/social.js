import { createAdminClient } from "@/lib/supabase/admin";
import { daysAgoStartIso } from "@/lib/admin/time";

export async function getSocialMetrics() {
  const admin = createAdminClient();
  const todayStart = daysAgoStartIso(0);
  const weekStart = daysAgoStartIso(7);

  const [
    friendships,
    nudgesToday,
    nudgesWeek,
    notesWeek,
    expiredUnread,
    notifications,
    unreadNotifs,
  ] = await Promise.all([
    admin.from("friendships").select("status"),
    admin
      .from("friend_nudges")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart),
    admin
      .from("friend_nudges")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekStart),
    admin
      .from("friend_notes")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekStart),
    admin
      .from("friend_notes")
      .select("*", { count: "exact", head: true })
      .lt("expires_at", new Date().toISOString())
      .is("read_at", null),
    admin.from("notifications").select("type").gte("created_at", weekStart),
    admin
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .is("read_at", null),
  ]);

  const status = { pending: 0, accepted: 0, rejected: 0 };
  for (const row of friendships.data || []) {
    if (status[row.status] != null) status[row.status] += 1;
  }

  const notifByType = {};
  for (const row of notifications.data || []) {
    const t = row.type || "unknown";
    notifByType[t] = (notifByType[t] || 0) + 1;
  }

  const totalDecided = status.accepted + status.rejected + status.pending;
  const acceptRate = totalDecided
    ? Math.round((status.accepted / totalDecided) * 1000) / 10
    : 0;

  return {
    status,
    acceptRate,
    nudgesToday: nudgesToday.count || 0,
    nudgesWeek: nudgesWeek.count || 0,
    notesWeek: notesWeek.count || 0,
    expiredUnread: expiredUnread.count || 0,
    unreadNotifications: unreadNotifs.count || 0,
    notifByType,
  };
}
