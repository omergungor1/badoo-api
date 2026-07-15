export function getAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email) {
  if (!email) return false;
  return getAdminEmails().includes(String(email).toLowerCase());
}

export async function requireAdmin() {
  const { createClient } = await import("@/lib/supabase/server");
  const { redirect } = await import("next/navigation");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    redirect("/login");
  }

  if (!isAdminEmail(data.user.email)) {
    await supabase.auth.signOut();
    redirect("/login?error=" + encodeURIComponent("Bu hesap admin değil."));
  }

  return data.user;
}
