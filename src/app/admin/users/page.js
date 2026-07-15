import Link from "next/link";
import {
  ErrorBox,
  PageHeader,
  Panel,
  SimpleTable,
} from "@/components/admin/ui";
import { listUsers } from "@/lib/admin/users";
import { formatNumber } from "@/lib/admin/time";

export const metadata = { title: "Kullanıcılar" };
export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }) {
  const params = await searchParams;
  const q = params?.q || "";
  const page = Math.max(1, Number(params?.page) || 1);

  let result;
  let error;

  try {
    result = await listUsers({ q, page, pageSize: 25 });
  } catch (err) {
    error = err?.message || String(err);
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Kullanıcılar" />
        <ErrorBox error={error} />
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div>
      <PageHeader
        title="Kullanıcılar"
        description={`${formatNumber(result.total)} profil · nickname ile ara`}
      />

      <form className="mb-5 flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Nickname ara…"
          className="w-full max-w-md rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
        />
        <button
          type="submit"
          className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black"
        >
          Ara
        </button>
      </form>

      <Panel>
        <SimpleTable
          columns={[
            {
              key: "nickname",
              label: "Nickname",
              render: (row) => (
                <Link
                  href={`/admin/users/${row.user_id || row.id}`}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  {row.nickname || "—"}
                </Link>
              ),
            },
            {
              key: "onboarding_completed",
              label: "Onboarding",
              render: (row) => (row.onboarding_completed ? "Evet" : "Hayır"),
            },
            {
              key: "goals",
              label: "Hedefler",
              render: (row) =>
                [
                  row.daily_calorie_goal && `${row.daily_calorie_goal} kcal`,
                  row.daily_protein_goal && `${row.daily_protein_goal}p`,
                  row.daily_water_goal && `${row.daily_water_goal}ml`,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—",
            },
            {
              key: "gender",
              label: "Cinsiyet",
              render: (row) => row.gender || "—",
            },
            {
              key: "created_at",
              label: "Kayıt",
              render: (row) =>
                row.created_at
                  ? new Date(row.created_at).toLocaleString("tr-TR")
                  : "—",
            },
            {
              key: "updated_at",
              label: "Güncelleme",
              render: (row) =>
                row.updated_at
                  ? new Date(row.updated_at).toLocaleString("tr-TR")
                  : "—",
            },
          ]}
          rows={result.users}
        />
      </Panel>

      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted">
        {page > 1 ? (
          <Link
            href={`/admin/users?q=${encodeURIComponent(q)}&page=${page - 1}`}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 font-medium text-foreground hover:bg-surface-2"
          >
            Önceki
          </Link>
        ) : null}
        <span>
          Sayfa {page} / {totalPages}
        </span>
        {page < totalPages ? (
          <Link
            href={`/admin/users?q=${encodeURIComponent(q)}&page=${page + 1}`}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 font-medium text-foreground hover:bg-surface-2"
          >
            Sonraki
          </Link>
        ) : null}
      </div>
    </div>
  );
}
