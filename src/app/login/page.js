import { login } from "@/app/auth/actions";

export const metadata = {
  title: "Admin Giriş",
};

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const error = params?.error;
  const next = params?.next || "/admin/dashboard";

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 420px at 15% -10%, rgba(15,118,110,0.16), transparent 60%), radial-gradient(700px 380px at 90% 10%, rgba(17,17,16,0.08), transparent 55%)",
        }}
      />

      <div className="relative w-full max-w-[420px] rounded-2xl border border-border bg-surface p-7 shadow-elevated sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-base font-bold text-white">
            B
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-subtle">
              Badoo
            </p>
            <h1 className="text-xl font-semibold tracking-tight">Admin Panel</h1>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-muted">
          Yalnızca `ADMIN_EMAILS` listesindeki hesaplar bu konsola giriş
          yapabilir.
        </p>

        {error ? (
          <p className="mt-4 rounded-xl border border-danger/20 bg-danger-soft px-3 py-2.5 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <form action={login} className="mt-7 space-y-4">
          <input type="hidden" name="next" value={next} />

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">E-posta</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">Şifre</span>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              autoComplete="current-password"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-white transition hover:bg-black"
          >
            Panele gir
          </button>
        </form>
      </div>
    </main>
  );
}
