/* =========================================================================
   v0.138 — EL MODELO DE CRUCES CON FECHA DE CORTE, RECENCIA, PESO POR
   TORNEO Y ENCOGIMIENTO BAYESIANO. Y su BACKTEST.

   Sin imports, para probarlo. Fórmulas y parámetros: README.md (al lado).

   Lo que hace, para un cruce A contra B a fecha `corte`:
     1. Solo partidas ANTERIORES a `corte` (nunca posteriores: sin fugas).
     2. Cada partida pesa w = exp(−Δdías/τ) · peso del torneo, donde el peso
        del torneo hace de «fuerza del rival»: de fuera no sabemos quién jugó,
        pero cuanto más competitivo el torneo, mejor es la gente (decisión de
        Ibai, 25/11/2026).
     3. Con las victorias y derrotas ponderadas (empate = media y media), la
        probabilidad sale de una Beta(a + V, b + D): con pocas partidas tira
        hacia el 50 %. Se dice el tamaño de muestra efectivo y un intervalo.
   ========================================================================= */

export type PartidaModelo = {
  fecha: string; // aaaa-mm-dd
  a: string;     // líder del mazo de un lado
  b: string;     // líder del otro
  r: 1 | 0 | 0.5; // resultado para A
  tipo: string;  // tipo de torneo (ver PESO_TORNEO)
};

/** Peso por tipo de torneo: lo competitivo del campo. Configurable. */
export const PESO_TORNEO: Record<string, number> = {
  worlds: 1, international: 1, regional: 1, special: 1,
  city_league: 0.6, league_cup: 0.6, league_challenge: 0.5,
  liga: 0.5, online: 0.4, amistoso: 0.3, otro: 0.4,
};
export const pesoTorneo = (tipo: string) => PESO_TORNEO[tipo] ?? PESO_TORNEO.otro;

export type Parametros = {
  /** Constante de recencia en días (∞ = sin recencia). */
  tau: number;
  /** Prior Beta(a, b) simétrico: cuántas partidas «imaginarias» al 50 % (a = b = prior/2). */
  prior: number;
  /** Ventana: solo partidas de los últimos N días antes del corte (∞ = todas). */
  ventana: number;
};
export const PARAMETROS_POR_DEFECTO: Parametros = { tau: 60, prior: 8, ventana: Infinity };

const DIA = 86_400_000;
const dias = (desde: string, hasta: string) => (Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / DIA;

export type Estimacion = {
  /** Probabilidad de que gane A (media de la Beta). */
  p: number;
  /** Intervalo del 90 % (aprox. normal de la Beta, acotado a [0, 1]). */
  ic: [number, number];
  /** Tamaño de muestra efectivo: suma de pesos. */
  nEf: number;
  /** Partidas reales detrás. */
  n: number;
  /** La fecha del dato más reciente usado (null si ninguno). */
  ultimo: string | null;
};

/** El cruce A–B a fecha `corte`, con lo anterior a ella. Las partidas B–A cuentan al revés. */
export function estimarCruce(partidas: readonly PartidaModelo[], a: string, b: string, corte: string, par: Parametros = PARAMETROS_POR_DEFECTO): Estimacion {
  let v = 0, d = 0, n = 0, ultimo: string | null = null;
  for (const m of partidas) {
    if (m.fecha >= corte) continue; // sin fugas: solo lo anterior
    const delta = dias(m.fecha, corte);
    if (delta > par.ventana) continue;
    let r: number;
    if (m.a === a && m.b === b) r = m.r;
    else if (m.a === b && m.b === a) r = 1 - m.r;
    else continue;
    const w = (Number.isFinite(par.tau) ? Math.exp(-delta / par.tau) : 1) * pesoTorneo(m.tipo);
    v += w * r; d += w * (1 - r); n++;
    if (!ultimo || m.fecha > ultimo) ultimo = m.fecha;
  }
  const al = par.prior / 2 + v, be = par.prior / 2 + d;
  const p = al / (al + be);
  const sd = Math.sqrt((al * be) / ((al + be) ** 2 * (al + be + 1)));
  return { p, ic: [Math.max(0, p - 1.645 * sd), Math.min(1, p + 1.645 * sd)], nEf: v + d, n, ultimo };
}

export type Metricas = { n: number; brier: number | null; logloss: number | null; brierBase: number | null; acierto: number | null };

export function metricas(pares: ReadonlyArray<{ p: number; r: number }>): Metricas {
  const n = pares.length;
  if (!n) return { n: 0, brier: null, logloss: null, brierBase: null, acierto: null };
  const eps = 1e-6;
  const brier = pares.reduce((s, x) => s + (x.p - x.r) ** 2, 0) / n;
  const logloss = -pares.reduce((s, x) => {
    const p = Math.min(1 - eps, Math.max(eps, x.p));
    return s + (x.r * Math.log(p) + (1 - x.r) * Math.log(1 - p));
  }, 0) / n;
  const brierBase = pares.reduce((s, x) => s + (0.5 - x.r) ** 2, 0) / n;
  const dec = pares.filter((x) => x.p !== 0.5 && x.r !== 0.5);
  const acierto = dec.length ? dec.filter((x) => (x.p > 0.5) === (x.r === 1)).length / dec.length : null;
  return { n, brier, logloss, brierBase, acierto };
}

/**
 * BACKTEST: cada partida se predice SOLO con las anteriores a su fecha, y se
 * compara con lo que pasó. Las partidas sin ningún dato previo del cruce no
 * cuentan (el modelo diría 50 % por pura ignorancia y no hay nada que medir).
 */
export function backtest(partidas: readonly PartidaModelo[], par: Parametros = PARAMETROS_POR_DEFECTO, minPrevias = 1) {
  const pares: Array<{ p: number; r: number }> = [];
  for (const m of partidas) {
    if (m.a === m.b) continue; // el espejo no se predice: es 50 % por definición
    const e = estimarCruce(partidas, m.a, m.b, m.fecha, par);
    if (e.n < minPrevias) continue;
    pares.push({ p: e.p, r: m.r });
  }
  return metricas(pares);
}

/** Prueba una rejilla de parámetros y devuelve todas, ordenadas por Brier (la mejor, primero). */
export function ajustar(partidas: readonly PartidaModelo[], taus: number[], priors: number[], ventana = Infinity) {
  const out: Array<{ par: Parametros; m: Metricas }> = [];
  for (const tau of taus) for (const prior of priors) {
    const par = { tau, prior, ventana };
    out.push({ par, m: backtest(partidas, par) });
  }
  return out.filter((x) => x.m.brier != null).sort((x, y) => x.m.brier! - y.m.brier!);
}
