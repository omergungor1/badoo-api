"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { logout } from "@/app/auth/actions";
import { AdminNav } from "@/components/admin/nav";

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
        style={{ background: "#0f766e" }}
      >
        B
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold tracking-tight text-white">
          Badoo
        </p>
        <p className="truncate text-xs" style={{ color: "#a3a3a0" }}>
          Admin Console
        </p>
      </div>
    </div>
  );
}

function SidebarFooter({ email }) {
  return (
    <div className="border-t border-white/10 p-4">
      <div
        className="rounded-xl px-3 py-3"
        style={{ background: "rgba(255,255,255,0.05)" }}
      >
        <p className="truncate text-xs" style={{ color: "#a3a3a0" }}>
          Oturum
        </p>
        <p className="mt-1 truncate text-sm font-medium text-white">{email}</p>
        <form action={logout} className="mt-3">
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/10"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            Çıkış yap
          </button>
        </form>
      </div>
    </div>
  );
}

function SidebarBody({ email, onNavigate }) {
  return (
    <>
      <div className="border-b border-white/10 px-4 py-5">
        <Brand />
      </div>
      <div className="admin-scroll flex-1 overflow-y-auto px-3 py-4">
        <p
          className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: "#a3a3a0" }}
        >
          Menü
        </p>
        <AdminNav onNavigate={onNavigate} />
      </div>
      <SidebarFooter email={email} />
    </>
  );
}

export function AdminShell({ email, children }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="min-h-dvh bg-background">
      <aside className="admin-sidebar fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col md:flex">
        <SidebarBody email={email} />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Menüyü kapat"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <aside className="admin-sidebar absolute inset-y-0 left-0 flex w-[min(86vw,280px)] flex-col shadow-elevated">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <Brand />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
                aria-label="Kapat"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                  <path
                    d="M6 6l12 12M18 6 6 18"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <div className="admin-scroll flex-1 overflow-y-auto px-3 py-4">
              <AdminNav onNavigate={() => setOpen(false)} />
            </div>
            <SidebarFooter email={email} />
          </aside>
        </div>
      ) : null}

      <div className="md:pl-[260px]">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur md:h-16 md:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-foreground md:hidden"
              onClick={() => setOpen(true)}
              aria-label="Menüyü aç"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <div className="hidden sm:block">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-subtle">
                Badoo Admin
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden max-w-[220px] truncate rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs text-muted sm:inline">
              {email}
            </span>
            <form action={logout} className="sm:hidden">
              <button
                type="submit"
                className="rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium"
              >
                Çıkış
              </button>
            </form>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
