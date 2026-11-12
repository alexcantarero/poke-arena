/* =========================================================================
   v0.120 — La tendencia del metagame online: cuota de cada mazo este mes,
   el mes pasado y el anterior.

   Sin imports, para probarlo.

   Por qué hace falta una MUESTRA: Limitless tiene miles de torneos online
   cada mes. Pedir la clasificación de todos es imposible en una página, así
   que de cada periodo de 30 días se cogen los N torneos más grandes. Los
   grandes son además los más representativos (más listas, más variedad).

   Esto también arregla el filtro de días: antes se pedían solo los 100
   torneos más recientes —que cubren 3 o 4 días— y daba igual pedir 14, 30 o
   90 días: salía casi lo mismo.
   ========================================================================= */

export const DIAS_PERIODO = 30;
export const PERIODOS = 3;

export type TorneoMuestra = { id: string; date: string; players: number };

const DIA = 86_400_000;

/** Índice del periodo (0 = los últimos 30 días, 1 = el mes anterior…) o -1 si queda fuera. */
export function periodoDe(fecha: string, ahoraMs: number, diasPeriodo = DIAS_PERIODO, periodos = PERIODOS): number {
  const t = Date.parse(fecha);
  if (!Number.isFinite(t)) return -1;
  const dias = (ahoraMs - t) / DIA;
  if (dias < 0) return 0;
  const p = Math.floor(dias / diasPeriodo);
  return p < periodos ? p : -1;
}

/** De cada periodo, los `porPeriodo` torneos con más jugadores (a igualdad, el más reciente). */
export function muestraPorPeriodos<T extends TorneoMuestra>(
  torneos: readonly T[], ahoraMs: number, porPeriodo: number, diasPeriodo = DIAS_PERIODO, periodos = PERIODOS,
): T[][] {
  const cubos: T[][] = Array.from({ length: periodos }, () => []);
  for (const t of torneos) {
    const p = periodoDe(t.date, ahoraMs, diasPeriodo, periodos);
    if (p >= 0) cubos[p].push(t);
  }
  return cubos.map((c) => [...c]
    .sort((a, b) => b.players - a.players || b.date.localeCompare(a.date))
    .slice(0, porPeriodo));
}

/** Cuota de cada mazo en un periodo, a partir de cuántas listas tiene. */
export function cuotas(listas: ReadonlyMap<string, number>): Map<string, number> {
  const total = [...listas.values()].reduce((s, n) => s + n, 0);
  const out = new Map<string, number>();
  for (const [k, n] of listas) out.set(k, total ? n / total : 0);
  return out;
}

export type Tendencia = "sube" | "baja" | "estable" | "nuevo";

/**
 * Sube o baja: se compara la cuota actual con la media de los dos meses
 * anteriores. Un cambio de menos de medio punto (o de menos del 15 % de la
 * cuota) es ruido de muestra: «estable». Sin cuota antes, «nuevo».
 */
export function tendenciaDe(serie: ReadonlyArray<number | null>): Tendencia {
  const [ahora, ...antes] = serie;
  const previas = antes.filter((x): x is number => x != null && x > 0);
  if (!ahora) return previas.length ? "baja" : "estable";
  if (!previas.length) return "nuevo";
  const media = previas.reduce((s, x) => s + x, 0) / previas.length;
  const diff = ahora - media;
  if (Math.abs(diff) < Math.max(0.005, media * 0.15)) return "estable";
  return diff > 0 ? "sube" : "baja";
}
