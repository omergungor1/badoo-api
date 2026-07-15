export { AdminShell } from "@/components/admin/shell";

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-4 shadow-card transition hover:shadow-elevated sm:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-[1.65rem]">
        {value}
      </p>
      {hint ? (
        <p className="mt-1.5 text-xs leading-relaxed text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function AlertList({ alerts }) {
  const colors = {
    red: "border-danger/20 bg-danger-soft text-danger",
    yellow: "border-warning/20 bg-warning-soft text-warning",
    green: "border-success/20 bg-success-soft text-success",
  };

  return (
    <ul className="space-y-2.5">
      {alerts.map((a) => (
        <li
          key={a.title + a.detail}
          className={`rounded-xl border px-4 py-3 ${colors[a.level] || colors.yellow}`}
        >
          <p className="text-sm font-semibold">{a.title}</p>
          <p className="mt-1 text-sm opacity-90">{a.detail}</p>
        </li>
      ))}
    </ul>
  );
}

export function Panel({ title, children, className = "", action }) {
  return (
    <section
      className={`rounded-[var(--radius)] border border-border bg-surface shadow-card ${className}`}
    >
      {title ? (
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {action}
        </div>
      ) : null}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function SimpleTable({ columns, rows, empty = "Kayıt yok" }) {
  if (!rows?.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface-2/60 px-4 py-8 text-center text-sm text-muted">
        {empty}
      </div>
    );
  }

  return (
    <div className="admin-scroll -mx-1 overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-[11px] uppercase tracking-[0.1em] text-subtle">
            {columns.map((c) => (
              <th key={c.key} className="px-3 py-2.5 font-semibold">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.id || row.key || i}
              className="border-b border-border/70 transition last:border-0 hover:bg-surface-2/50"
            >
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-3 align-top text-foreground/90">
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ErrorBox({ error }) {
  return (
    <div className="rounded-[var(--radius)] border border-danger/20 bg-danger-soft px-5 py-4 text-sm text-danger">
      <p className="font-semibold">Veri yüklenemedi</p>
      <p className="mt-1 opacity-90">{error}</p>
      <p className="mt-2 text-xs opacity-80">
        `SUPABASE_SERVICE_ROLE_KEY` dolu mu ve `badoo` şeması API’de expose
        edilmiş mi kontrol edin.
      </p>
    </div>
  );
}

export function ButtonLink({ href, children, variant = "secondary" }) {
  const styles =
    variant === "primary"
      ? "bg-foreground text-white hover:bg-black"
      : "border border-border bg-surface text-foreground hover:bg-surface-2";

  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-sm font-medium transition ${styles}`}
    >
      {children}
    </a>
  );
}

export function MetricList({ items }) {
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li
          key={item.label}
          className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm hover:bg-surface-2/70"
        >
          <span className="text-muted">{item.label}</span>
          <span className="tabular-nums font-semibold text-foreground">
            {item.value}
            {item.meta ? (
              <span className="ml-2 text-xs font-normal text-subtle">
                {item.meta}
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
