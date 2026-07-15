import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin/auth";

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });

          Object.entries(headers || {}).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value);
          });
        },
      },
    },
  );

  const { data } = await supabase.auth.getUser();
  const user = data?.user || null;
  const path = request.nextUrl.pathname;

  supabaseResponse.headers.set("x-pathname", path);

  const isLogin = path === "/login";
  const isAdminRoute = path.startsWith("/admin");
  const isAuthCallback = path.startsWith("/auth/callback");

  if (isAuthCallback) {
    return supabaseResponse;
  }

  if (isAdminRoute) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }
    if (!isAdminEmail(user.email)) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "Bu hesap admin değil.");
      return NextResponse.redirect(url);
    }
  }

  if (isLogin && user && isAdminEmail(user.email)) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (path === "/" || path === "/signup") {
    const url = request.nextUrl.clone();
    url.pathname = user && isAdminEmail(user.email) ? "/admin/dashboard" : "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
