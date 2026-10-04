/* =========================================================================
   v0.19 — Filtros del Ranking: qué partidas, tipo de torneo, dónde, fechas
   y a quién. Todo por URL (se comparte y la vuelta atrás funciona).

   Sin imports a propósito: lo cargan los tests directamente.
   ========================================================================= */

export type VistaRanking = "all" | "league" | "tournament" | "casual";
export type DondeRanking = "both" | "onsite" | "online";
export type FechaRanking = "" | "temporada" | "30d" | "90d" | "anio" | "rango";

export type FiltroRanking = {
  vista: VistaRanking;
  donde: DondeRanking;
  /** Tipo de torneo (`regional`, `league_cup`…). "" = todos. */
  tipo: string;
  fecha: FechaRanking;
  /** Solo con `fecha = "rango"`. ISO YYYY-MM-DD. */
  desde: string;
  hasta: string;
  comp: string;
  fav: boolean;
};

export const FECHAS_RANKING: Array<{ v: FechaRanking; label: string }> = [
  { v: "", label: "Todas las fechas" },
  { v: "temporada", label: "Temporada de CP actual" },
  { v: "30d", label: "Últimos 30 días" },
  { v: "90d", label: "Últimos 90 días" },
  { v: "anio", label: "Este año" },
  { v: "rango", label: "Entre dos fechas…" },
];

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseFiltroRanking(q: Record<string, string | string[] | undefined>): FiltroRanking {
  const ambito = uno(q.ambito);
  // URLs antiguas: `ambito=onsite|online` era la vista de torneos con «dónde».
  const legado: DondeRanking | null = ambito === "onsite" ? "onsite" : ambito === "online" ? "online" : null;
  const vista: VistaRanking = legado ? "tournament"
    : ambito === "league" || ambito === "tournament" || ambito === "casual" ? ambito : "all";
  const d = uno(q.donde);
  const donde: DondeRanking = legado ?? (d === "onsite" || d === "online" ? d : "both");
  const f = uno(q.fecha);
  // `temporada=1` es el interruptor de antes de la v0.19.
  const fecha: FechaRanking = f === "temporada" || f === "30d" || f === "90d" || f === "anio" || f === "rango"
    ? f : uno(q.temporada) === "1" ? "temporada" : "";
  const desde = ISO.test(uno(q.desde)) ? uno(q.desde) : "";
  const hasta = ISO.test(uno(q.hasta)) ? uno(q.hasta) : "";
  return {
    vista,
    donde: vista === "tournament" || vista === "all" ? donde : "both",
    tipo: vista === "tournament" || vista === "all" ? uno(q.tipo).slice(0, 40) : "",
    fecha,
    desde: fecha === "rango" ? desde : "",
    hasta: fecha === "rango" ? hasta : "",
    comp: vista === "league" ? uno(q.comp).slice(0, 80) : "",
    fav: uno(q.fav) === "1",
  };
}

/**
 * El intervalo de fechas [from, to] (inclusivo, ISO) que pide el filtro, o
 * null si no recorta por fecha. La temporada NO va aquí: se resuelve aparte
 * con `seasonOfDate`, porque no es un intervalo fijo de días.
 */
export function rangoDeFechas(f: FiltroRanking, hoy: string): { from: string | null; to: string | null } | null {
  const menos = (dias: number) => {
    const d = new Date(`${hoy}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - dias);
    return d.toISOString().slice(0, 10);
  };
  switch (f.fecha) {
    case "30d": return { from: menos(30), to: hoy };
    case "90d": return { from: menos(90), to: hoy };
    case "anio": return { from: `${hoy.slice(0, 4)}-01-01`, to: hoy };
    case "rango":
      if (!f.desde && !f.hasta) return null;
      // Si las ponen al revés, se entiende lo que querían.
      if (f.desde && f.hasta && f.desde > f.hasta) return { from: f.hasta, to: f.desde };
      return { from: f.desde || null, to: f.hasta || null };
    default: return null;
  }
}

export function dentroDeRango(fecha: string, r: { from: string | null; to: string | null } | null): boolean {
  if (!r) return true;
  if (r.from && fecha < r.from) return false;
  if (r.to && fecha > r.to) return false;
  return true;
}

/** Los parámetros de URL de un filtro (sin los valores por defecto). */
export function filtroAQuery(f: FiltroRanking): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.vista !== "all") sp.set("ambito", f.vista);
  if (f.donde !== "both") sp.set("donde", f.donde);
  if (f.tipo) sp.set("tipo", f.tipo);
  if (f.fecha) sp.set("fecha", f.fecha);
  if (f.desde) sp.set("desde", f.desde);
  if (f.hasta) sp.set("hasta", f.hasta);
  if (f.comp) sp.set("comp", f.comp);
  if (f.fav) sp.set("fav", "1");
  return sp;
}
