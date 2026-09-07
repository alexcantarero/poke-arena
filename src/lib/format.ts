export const MONTHS = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
export const DOWS = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

export const todayISO = () => new Date().toISOString().slice(0, 10);

export function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${String(d.getFullYear()).slice(2)}`;
}

export function fmtDateLong(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

export function relDays(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  const t = new Date(`${todayISO()}T12:00:00`);
  const n = Math.round((d.getTime() - t.getTime()) / 86400000);
  if (n === 0) return "hoy";
  if (n === 1) return "mañana";
  if (n === -1) return "ayer";
  return n > 0 ? `en ${n} días` : `hace ${Math.abs(n)} días`;
}

export function pct(v: number | null | undefined, digits = 1) {
  if (v == null || Number.isNaN(v)) return "—";
  return `${(v * 100).toFixed(digits)}%`;
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function shortName(s: string, n = 22) {
  return s && s.length > n ? `${s.slice(0, n - 1)}…` : s || "";
}

/** Color semántico de un porcentaje de victorias. */
export function wrColor(wp: number | null | undefined) {
  if (wp == null) return "var(--muted)";
  if (wp >= 0.6) return "var(--win)";
  if (wp <= 0.4) return "var(--loss)";
  return "var(--blue)";
}

let counter = 0;
export function newId(prefix: string) {
  counter = (counter + 1) % 1000;
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
