import { createClient } from "@supabase/supabase-js";

/**
 * Mobil app: Authorization: Bearer <supabase_access_token>
 * Cookie session (admin web) da desteklenir.
 *
 * // TODO: auth burada entegre edilecek — token doğrulama mevcut; ekstra claim/RLS
 * // kuralları istersen buraya eklenebilir.
 *
 * @returns {Promise<{ user: { id: string, email?: string }, accessToken: string|null }>}
 */
export async function requireMealUser(request) {
  const authHeader = request.headers.get("authorization") || "";
  const bearer = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  if (bearer) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishable =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !publishable) {
      const err = new Error("Supabase public env eksik");
      err.status = 500;
      throw err;
    }

    // Anon/publishable key + access token ile kullanıcı doğrula
    const supabase = createClient(url, publishable, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.auth.getUser(bearer);
    if (error || !data?.user) {
      const err = new Error("Geçersiz veya süresi dolmuş access token");
      err.status = 401;
      throw err;
    }

    return { user: data.user, accessToken: bearer };
  }

  // Web cookie session fallback
  const { createClient: createServerCookieClient } = await import(
    "@/lib/supabase/server"
  );
  const cookieClient = await createServerCookieClient();
  const { data, error } = await cookieClient.auth.getUser();

  if (error || !data?.user) {
    const err = new Error(
      "Unauthorized — Authorization: Bearer <access_token> gerekli",
    );
    err.status = 401;
    throw err;
  }

  return { user: data.user, accessToken: null };
}
