"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/auth";

export async function login(formData) {
  const supabase = await createClient();

  const email = String(formData.get("email") || "").trim();
  const password = formData.get("password");
  const next = String(formData.get("next") || "/admin/dashboard");

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  if (!isAdminEmail(data.user?.email)) {
    await supabase.auth.signOut();
    redirect(
      `/login?error=${encodeURIComponent("Bu e-posta admin listesinde yok.")}`,
    );
  }

  redirect(next.startsWith("/admin") ? next : "/admin/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
