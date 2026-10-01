/* =========================================================================
   v0.15 — Enfrentamientos directos entre gente del grupo.

   Dos fuentes, y una trampa:

   · Las partidas internas (liga y amistosos): A contra B, una fila.
   · Las rondas de torneo en las que el rival es alguien del grupo
     (`opponentPlayerId`, nuevo en esta versión). **La trampa**: si Ibai y Alex
     se cruzan en la ronda 3 de un Challenge y los dos apuntan su ronda, hay
     DOS filas para un solo enfrentamiento. Se cuentan una vez, con la clave
     (torneo, ronda, pareja sin orden).

   Sin imports, como el resto de módulos probados.
   ========================================================================= */

export type Encuentro = {
  /** Clave de deduplicado. Dos encuentros con la misma clave son uno. */
  clave: string;
  a: string;
  b: string;
  /** Desde el lado de `a`. */
  resultado: "a" | "b" | "tie" | null;
};

export type Cruce = { partidas: number; gana: number; pierde: number; empata: number };

export type MatrizH2H = {
  /** Jugadores con al menos un cruce, del que más ha jugado al que menos. */
  ids: string[];
  /** `celda(x, y)`: lo que ha hecho X contra Y. */
  celda: (x: string, y: string) => Cruce;
  max: number;
  total: number;
};

const VACIO: Cruce = { partidas: 0, gana: 0, pierde: 0, empata: 0 };

/** Clave para una ronda de torneo entre dos del grupo: igual se apunte desde un lado o desde el otro. */
export function claveRonda(tournamentId: string, round: number, x: string, y: string): string {
  const [p, q] = x < y ? [x, y] : [y, x];
  return `t:${tournamentId}:${round}:${p}:${q}`;
}

export function matrizH2H(encuentros: Encuentro[]): MatrizH2H {
  const vistos = new Set<string>();
  const celdas = new Map<string, Cruce>();
  const jugadas = new Map<string, number>();

  const suma = (x: string, y: string, r: "gana" | "pierde" | "empata" | null) => {
    const k = `${x}|${y}`;
    const c = { ...(celdas.get(k) ?? VACIO) };
    c.partidas++;
    if (r) c[r]++;
    celdas.set(k, c);
  };

  let total = 0;
  for (const e of encuentros) {
    if (!e.a || !e.b || e.a === e.b) continue;
    if (vistos.has(e.clave)) continue;
    vistos.add(e.clave);
    total++;
    const ra = e.resultado === "a" ? "gana" : e.resultado === "b" ? "pierde" : e.resultado === "tie" ? "empata" : null;
    const rb = e.resultado === "a" ? "pierde" : e.resultado === "b" ? "gana" : e.resultado === "tie" ? "empata" : null;
    suma(e.a, e.b, ra);
    suma(e.b, e.a, rb);
    jugadas.set(e.a, (jugadas.get(e.a) ?? 0) + 1);
    jugadas.set(e.b, (jugadas.get(e.b) ?? 0) + 1);
  }

  const ids = [...jugadas.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).map(([id]) => id);
  const max = Math.max(0, ...[...celdas.values()].map((c) => c.partidas));
  return { ids, celda: (x, y) => celdas.get(`${x}|${y}`) ?? VACIO, max, total };
}
