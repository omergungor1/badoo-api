const TZ = "Europe/Istanbul";

/** İstanbul takvim günü YYYY-MM-DD */
export function istanbulDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** İstanbul gece yarısı → UTC ISO (dahil) */
export function istanbulDayStartIso(date = new Date()) {
  const day = istanbulDateString(date);
  return istanbulWallTimeToUtcIso(day, "00:00:00");
}

/** Bir sonraki İstanbul günü gece yarısı → UTC ISO (hariç) */
export function istanbulDayEndExclusiveIso(date = new Date()) {
  const day = istanbulDateString(date);
  const next = addDaysToDateString(day, 1);
  return istanbulWallTimeToUtcIso(next, "00:00:00");
}

export function daysAgoStartIso(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return istanbulDayStartIso(d);
}

function addDaysToDateString(ymd, days) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/**
 * Avrupa/İstanbul duvar saatini UTC ISO'ya çevirir.
 * Basit offset tahmini (DST için Intl offset kullanır).
 */
function istanbulWallTimeToUtcIso(ymd, hms) {
  const probe = new Date(`${ymd}T${hms}+03:00`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    timeZoneName: "shortOffset",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(probe);

  const get = (type) => parts.find((p) => p.type === type)?.value;
  const offsetRaw = get("timeZoneName") || "GMT+3";
  const match = offsetRaw.match(/GMT([+-])(\d+)(?::(\d+))?/);
  let offsetMinutes = 180;
  if (match) {
    const sign = match[1] === "-" ? -1 : 1;
    offsetMinutes = sign * (Number(match[2]) * 60 + Number(match[3] || 0));
  }

  const [y, m, d] = ymd.split("-").map(Number);
  const [hh, mm, ss] = hms.split(":").map(Number);
  const utcMs =
    Date.UTC(y, m - 1, d, hh, mm, ss) - offsetMinutes * 60 * 1000;
  return new Date(utcMs).toISOString();
}

export function formatNumber(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("tr-TR").format(n);
}

export function formatPercent(part, total) {
  if (!total) return "0%";
  return `${Math.round((part / total) * 1000) / 10}%`;
}

export function truncate(str, len = 80) {
  if (!str) return "—";
  const s = String(str);
  return s.length > len ? `${s.slice(0, len)}…` : s;
}
