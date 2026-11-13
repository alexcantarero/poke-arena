/* =========================================================================
   v0.129 — PREPARACIÓN DE TORNEO: qué mazos te vas a cruzar y cómo te va
   contra cada uno con el tuyo.

   Sin imports, para probarlo. No calcula nada nuevo: ordena lo que ya saben
   el recomendador (`lib/recomendador.ts`: el campo esperado y el % de cada
   cruce, con las partidas que hay detrás) y tu propio historial, y lo deja
   listo para leerlo la víspera.

   Tres reglas para que no engañe:
     · Un cruce con pocas partidas detrás NO se llama favorable ni
       desfavorable: «pocos datos». El % sale igual, encogido hacia el 50.
     · «Cuidado con» ordena por DAÑO (cuánto te lo vas a cruzar × cuánto te
       falta para el 50 %), no por el peor porcentaje: un 30 % contra un mazo
       que no juega nadie importa menos que un 44 % contra el más jugado.
     · El % esperado contra el campo solo cuenta los mazos listados, y se dice
       qué parte del campo cubren.
   ========================================================================= */

export type Marca = { w: number; l: number; t: number };
export type TonoCruce = "favorable" | "parejo" | "desfavorable" | "pocosDatos" | "espejo";

export type FilaPreparacion = {
  lider: string;
  nombre: string;
  /** Fracción del campo (0–1). */
  cuota: number;
  /** Tu probabilidad de ganar la ronda (0–1), ya al formato del torneo. */
  p: number;
  /** Partidas que hay detrás de ese %. */
  n: number;
  /** Tu propio historial con este mazo contra ese, si lo hay. */
  mio: Marca | null;
  tono: TonoCruce;
};

export type Preparacion = {
  filas: FilaPreparacion[];
  /** Tu % esperado por ronda contra los mazos listados; null si no hay campo. */
  esperado: number | null;
  /** Qué parte del campo cubren los mazos listados (0–1). */
  cubierto: number;
  cuidado: FilaPreparacion[];
  aFavor: FilaPreparacion[];
};

export const PREP_MIN_PARTIDAS = 12;
export const PREP_FAVORABLE = 0.55;
export const PREP_DESFAVORABLE = 0.45;

export function tonoDeCruce(p: number, n: number, espejo: boolean): TonoCruce {
  if (espejo) return "espejo";
  if (n < PREP_MIN_PARTIDAS) return "pocosDatos";
  return p >= PREP_FAVORABLE ? "favorable" : p <= PREP_DESFAVORABLE ? "desfavorable" : "parejo";
}

export function prepararTorneo(o: {
  miLider: string;
  campo: Record<string, number>;
  probs: Record<string, { p: number; n: number }>;
  mio?: Record<string, Marca>;
  nombres?: Record<string, string>;
  /** Cuántos mazos listar. */
  top?: number;
  /** Cuota mínima para salir en la lista. */
  minCuota?: number;
}): Preparacion {
  const top = o.top ?? 12, minCuota = o.minCuota ?? 0.01;
  const filas: FilaPreparacion[] = Object.entries(o.campo)
    .filter(([l, c]) => l && c >= minCuota)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, top)
    .map(([lider, cuota]) => {
      const espejo = lider === o.miLider;
      const pr = espejo ? { p: 0.5, n: 0 } : o.probs[lider] ?? { p: 0.5, n: 0 };
      return { lider, nombre: o.nombres?.[lider] ?? lider, cuota, p: pr.p, n: pr.n, mio: o.mio?.[lider] ?? null, tono: tonoDeCruce(pr.p, pr.n, espejo) };
    });
  const cubierto = filas.reduce((a, f) => a + f.cuota, 0);
  const esperado = cubierto > 0 ? filas.reduce((a, f) => a + f.cuota * f.p, 0) / cubierto : null;
  const dano = (f: FilaPreparacion) => f.cuota * (0.5 - f.p);
  return {
    filas, esperado, cubierto,
    cuidado: filas.filter((f) => f.tono === "desfavorable").sort((a, b) => dano(b) - dano(a)).slice(0, 3),
    aFavor: filas.filter((f) => f.tono === "favorable").sort((a, b) => dano(a) - dano(b)).slice(0, 3),
  };
}

/** Tu historial con un mazo: contra cada líder rival, victorias, derrotas y empates. */
export function historialPropio(
  partidas: ReadonlyArray<{ mio: string; rival: string; r: "w" | "l" | "t" }>, miLider: string,
): Record<string, Marca> {
  const out: Record<string, Marca> = {};
  for (const x of partidas) {
    if (!miLider || x.mio !== miLider || !x.rival) continue;
    const m = (out[x.rival] ??= { w: 0, l: 0, t: 0 });
    m[x.r]++;
  }
  return out;
}
