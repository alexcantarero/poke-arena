export const MONTHS = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
export const DOWS = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

/** Zona horaria de la liga. Cambiarla aquí cambia qué día es "hoy" en toda la app. */
export const TZ = "Europe/Madrid";

/**
 * El día de hoy en la zona de la liga, no en UTC.
 *
 * Con `toISOString()` una partida registrada a las 00:30 de un martes de verano
 * se guardaba con fecha del lunes, y eso descoloca el Elo (que ordena por
 * fecha) y las rachas. El formato sueco es exactamente AAAA-MM-DD.
 */
export const todayISO = () => new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date());

/**
 * Una fecha con hora, en día de la liga.
 *
 * `toISOString()` da UTC, así que algo guardado a las 00:30 de Madrid salía con
 * la fecha del día anterior. Mismo criterio que `todayISO`.
 */
export const isoInLeagueTz = (d: Date) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(d);

/** ¿Es una fecha ISO real? Filtra tanto la basura como el 2026-02-31. */
export function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T12:00:00`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  const m = MONTHS[d.getMonth()];
  if (!m) return "—";
  return `${d.getDate()} ${m.slice(0, 3)} ${String(d.getFullYear()).slice(2)}`;
}

export function fmtDateLong(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  const m = MONTHS[d.getMonth()];
  if (!m) return "—";
  return `${d.getDate()} de ${m} de ${d.getFullYear()}`;
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
  // El mismo azul que la matriz de emparejamientos usa para "equilibrado".
  return "var(--series-1)";
}

let counter = 0;
export function newId(prefix: string) {
  counter = (counter + 1) % 1000;
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}


/**
 * Orden de agenda: lo que viene primero, y lo pasado después.
 *
 * El orden natural de una lista de torneos no es «el más nuevo arriba». Un
 * torneo del mes que viene importa más que el de la semana pasada, y el de
 * la semana pasada más que el de hace un año. Así que:
 *
 *   1. Primero los que aún no han pasado, **del más cercano al más lejano**.
 *   2. Después los ya jugados, del más reciente al más antiguo.
 *
 * Con fecha de hoy incluida en el primer grupo: un torneo que es hoy es lo
 * primero que uno quiere ver.
 *
 * `today` se pasa como argumento en vez de leerlo dentro para que la función
 * siga siendo pura y se pueda probar sin tocar el reloj.
 */
export function byAgenda<T extends { date: string }>(today: string) {
  return (a: T, b: T): number => {
    const futuroA = a.date >= today;
    const futuroB = b.date >= today;
    if (futuroA !== futuroB) return futuroA ? -1 : 1;
    // Los de delante, ascendente: el más cercano primero.
    // Los de detrás, descendente: el más reciente primero.
    return futuroA ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
  };
}
