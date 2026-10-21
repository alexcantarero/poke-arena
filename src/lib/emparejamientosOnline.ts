/* =========================================================================
   La matriz de emparejamientos del meta online, con partidas REALES.

   Sin imports, como el resto de módulos que se prueban.

   v0.52. Cruza dos endpoints oficiales de Limitless: `/standings` (qué mazo
   llevaba cada jugador) y `/pairings` (quién jugó contra quién y quién ganó).
   Es justo el uso que su documentación pone de ejemplo: combinar partidas y
   listas para analizar los emparejamientos. Antes, el % de un arquetipo salía
   del récord final de cada jugador; ahora sale de cada partida.

   Reglas, para que los porcentajes no mientan:
     · Un BYE (sin rival) no es una partida: fuera.
     · Una DOBLE DERROTA (`winner = -1`) no tiene ganador: fuera.
     · Un ESPEJO (mismo arquetipo a los dos lados) siempre da 50 %: se cuenta
       aparte y no entra en el % de nadie.
     · Si a uno de los dos le falta el mazo, la partida no informa: fuera.
   Lo descartado se cuenta, y la pantalla lo dice.

   Sin nombres de jugador: el id de usuario solo sirve para cruzar los dos
   endpoints, y no sale de este módulo.
   ========================================================================= */

export type Emparejamiento = { player1?: string | null; player2?: string | null; winner?: string | number | null };
export type MazoRef = { id: string; name: string; icons?: string[] };
export type Clasif = { player?: string | null; deck?: MazoRef | null };
export type Celda = { w: number; l: number; t: number };

export type Acumulado = {
  celdas: Map<string, Map<string, Celda>>;
  mazos: Map<string, MazoRef>;
  partidas: number;
  espejos: number;
  descartadas: number;
};

export const nuevoAcumulado = (): Acumulado =>
  ({ celdas: new Map(), mazos: new Map(), partidas: 0, espejos: 0, descartadas: 0 });

function celda(acc: Acumulado, a: string, b: string): Celda {
  let fila = acc.celdas.get(a);
  if (!fila) acc.celdas.set(a, (fila = new Map()));
  let c = fila.get(b);
  if (!c) fila.set(b, (c = { w: 0, l: 0, t: 0 }));
  return c;
}

/** Suma un torneo: su clasificación (para los mazos) y sus emparejamientos. */
export function acumular(acc: Acumulado, clasificacion: readonly Clasif[], pairings: readonly Emparejamiento[]): Acumulado {
  const mazoDe = new Map<string, MazoRef>();
  for (const c of clasificacion) if (c.player && c.deck?.id) mazoDe.set(c.player, c.deck);

  for (const p of pairings) {
    if (!p.player1 || !p.player2) { acc.descartadas++; continue; }          // bye
    if (p.winner === -1 || p.winner === "-1") { acc.descartadas++; continue; } // doble derrota
    const a = mazoDe.get(p.player1), b = mazoDe.get(p.player2);
    if (!a || !b) { acc.descartadas++; continue; }
    const empate = p.winner === 0 || p.winner === "0";
    const ganaA = p.winner === p.player1, ganaB = p.winner === p.player2;
    if (!empate && !ganaA && !ganaB) { acc.descartadas++; continue; }
    if (a.id === b.id) { acc.espejos++; continue; }

    acc.mazos.set(a.id, a); acc.mazos.set(b.id, b);
    const ab = celda(acc, a.id, b.id), ba = celda(acc, b.id, a.id);
    if (empate) { ab.t++; ba.t++; }
    else if (ganaA) { ab.w++; ba.l++; }
    else { ab.l++; ba.w++; }
    acc.partidas++;
  }
  return acc;
}

export type FilaMeta = MazoRef & { n: number; w: number; l: number; t: number; pct: number | null };

/** % con el empate como media victoria; null sin partidas. */
export const pctDe = (c: Celda) => {
  const n = c.w + c.l + c.t;
  return n ? (c.w + c.t / 2) / n : null;
};

/**
 * Los `top` arquetipos con más partidas (sin contar espejos), con su % total.
 * Por debajo de `minPartidas` un arquetipo no entra: con diez partidas un %
 * es ruido.
 */
export function resumen(acc: Acumulado, { top = 12, minPartidas = 30 } = {}): FilaMeta[] {
  const filas: FilaMeta[] = [];
  for (const [id, fila] of acc.celdas) {
    const tot = { w: 0, l: 0, t: 0 };
    for (const c of fila.values()) { tot.w += c.w; tot.l += c.l; tot.t += c.t; }
    const n = tot.w + tot.l + tot.t;
    if (n < minPartidas) continue;
    filas.push({ ...acc.mazos.get(id)!, n, ...tot, pct: pctDe(tot) });
  }
  return filas.sort((x, y) => y.n - x.n || x.name.localeCompare(y.name)).slice(0, top);
}

/** La celda de la fila `a` contra la columna `b`, o null si no se cruzaron. */
export function celdaDe(acc: Acumulado, a: string, b: string): Celda | null {
  return acc.celdas.get(a)?.get(b) ?? null;
}
