/* =========================================================================
   Seguimiento de jugadores en el tiempo.

   Sin imports, como el resto de módulos que se prueban.

   v0.50. Una fila por JUGADOR y PARTIDA (cada lado de una partida es una
   fila). Se agregan por día, semana o mes, con filtros de jugadores, tipos de
   partida y arquetipo, y salen partidas jugadas, récord, % de victorias y con
   qué arquetipos jugó cada uno en cada periodo.

   El eje es TIEMPO REAL Y CONTINUO: entre la primera y la última partida
   salen todos los periodos, también los vacíos. La gráfica del Elo pintaba un
   punto por partida, y por eso su eje repetía «26 sept, 26 sept»: dos partidas
   el mismo día eran dos posiciones distintas.
   ========================================================================= */

export type Granularidad = "dia" | "semana" | "mes";
export type Resultado = "w" | "l" | "t";

export type FilaSeguimiento = {
  /** Fecha ISO de la partida (`2026-10-17`). */
  d: string;
  /** Jugador de este lado. */
  p: string;
  /** Tipo de partida: liga, presencial, online o amistoso. */
  t: string;
  /** Resultado para ESTE jugador. */
  r: Resultado;
  /** Arquetipo con el que jugó, si se apuntó. */
  a: string | null;
};

export type Celda = {
  n: number; w: number; l: number; t: number;
  /** % de victorias (empate = media), o null si no jugó: un hueco, no un cero. */
  pct: number | null;
  /** Arquetipos jugados en el periodo, con cuántas partidas cada uno. */
  arqs: Record<string, number>;
};

const DIA = 86_400_000;
const utc = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** El periodo al que pertenece una fecha. Semanas de lunes a domingo. */
export function periodoDe(fecha: string, g: Granularidad): string {
  if (g === "mes") return fecha.slice(0, 7);
  if (g === "dia") return fecha.slice(0, 10);
  const ms = utc(fecha);
  const dow = (new Date(ms).getUTCDay() + 6) % 7;      // lunes = 0
  return iso(ms - dow * DIA);
}

/** Todos los periodos entre dos fechas, ambos incluidos y sin huecos. */
export function periodosEntre(desde: string, hasta: string, g: Granularidad): string[] {
  const out: string[] = [];
  if (g === "mes") {
    let [y, m] = desde.slice(0, 7).split("-").map(Number);
    const [y2, m2] = hasta.slice(0, 7).split("-").map(Number);
    while (y < y2 || (y === y2 && m <= m2)) {
      out.push(`${y}-${String(m).padStart(2, "0")}`);
      m++; if (m > 12) { m = 1; y++; }
    }
    return out;
  }
  const paso = g === "dia" ? DIA : 7 * DIA;
  for (let t = utc(periodoDe(desde, g)), fin = utc(periodoDe(hasta, g)); t <= fin; t += paso) out.push(iso(t));
  return out;
}

export type Filtros = {
  jugadores: readonly string[];
  tipos: readonly string[];
  /** Arquetipo concreto, o null para todos. */
  arquetipo: string | null;
  granularidad: Granularidad;
};

/**
 * Las series: por jugador, una celda por periodo.
 *
 * Los periodos se calculan sobre las filas que pasan los filtros de TIPO y
 * ARQUETIPO, pero de TODOS los jugadores: así, añadir o quitar a alguien de la
 * gráfica no estira ni encoge el eje.
 */
export function agregar(filas: readonly FilaSeguimiento[], f: Filtros) {
  const tipos = new Set(f.tipos);
  const validas = filas.filter((x) => tipos.has(x.t) && (f.arquetipo == null || x.a === f.arquetipo));
  if (!validas.length) return { periodos: [] as string[], series: {} as Record<string, Celda[]> };

  let min = validas[0].d, max = validas[0].d;
  for (const x of validas) { if (x.d < min) min = x.d; if (x.d > max) max = x.d; }
  const periodos = periodosEntre(min, max, f.granularidad);
  const idx = new Map(periodos.map((p, i) => [p, i]));

  const series: Record<string, Celda[]> = {};
  for (const j of f.jugadores) {
    series[j] = periodos.map(() => ({ n: 0, w: 0, l: 0, t: 0, pct: null, arqs: {} }));
  }
  for (const x of validas) {
    const s = series[x.p];
    if (!s) continue;
    const c = s[idx.get(periodoDe(x.d, f.granularidad))!];
    c.n++; c[x.r]++;
    if (x.a) c.arqs[x.a] = (c.arqs[x.a] ?? 0) + 1;
  }
  for (const s of Object.values(series)) {
    for (const c of s) c.pct = c.n ? (c.w + c.t / 2) / c.n : null;
  }
  return { periodos, series };
}

/** Los arquetipos de una celda, del más jugado al menos. */
export const arquetiposOrdenados = (c: Celda) =>
  Object.entries(c.arqs).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
