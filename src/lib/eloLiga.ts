/* =========================================================================
   v0.82 — Liga Elo libre: cualquiera contra cualquiera, las veces que sea.

   Sin imports, para probarlo.

   Para un grupo de ~20 personas que no cuadran horario cada semana: no hay
   jornadas. Cada partida apuntada en la liga mueve el Elo de los dos, y la
   clasificación es el Elo.
     · Ganarle a alguien con más Elo da más; a alguien con menos, menos
       (expectativa clásica: 1 / (1 + 10^((Rb − Ra) / 400))).
     · Cuantas más partidas llevas, menos se mueve tu Elo: K = 40 en las 10
       primeras, 24 hasta 30 y 16 a partir de ahí. Los nuevos se colocan rápido y
       los veteranos no bailan por una mala tarde.
     · Con menos de `PROVISIONAL` partidas, el puesto es provisional.
     · Una partida al mejor de 3 cuenta como una (lo que importa es la serie).
   ========================================================================= */

export const ELO_INICIAL = 1000;
export const PROVISIONAL = 5;

export const kDe = (partidas: number) => (partidas < 10 ? 40 : partidas < 30 ? 24 : 16);
export const esperado = (ra: number, rb: number) => 1 / (1 + Math.pow(10, (rb - ra) / 400));

export type PartidaElo = { a: string; b: string; ganador: "a" | "b" | "tie"; fecha: string };
export type FilaElo = {
  id: string; elo: number; partidas: number; w: number; l: number; t: number;
  /** Lo que movió su última partida. */
  ultimo: number;
  provisional: boolean;
};

export function eloLiga(partidas: PartidaElo[], jugadores: string[] = [], inicial = ELO_INICIAL): FilaElo[] {
  const f = new Map<string, FilaElo>();
  const de = (id: string) => {
    let x = f.get(id);
    if (!x) f.set(id, (x = { id, elo: inicial, partidas: 0, w: 0, l: 0, t: 0, ultimo: 0, provisional: true }));
    return x;
  };
  for (const id of jugadores) de(id);
  // En orden de fecha (y estable para las del mismo día).
  const orden = partidas.map((p, i) => ({ p, i })).sort((x, y) => x.p.fecha.localeCompare(y.p.fecha) || x.i - y.i);
  for (const { p } of orden) {
    if (!p.a || !p.b || p.a === p.b) continue;
    const A = de(p.a), B = de(p.b);
    const ea = esperado(A.elo, B.elo);
    const sa = p.ganador === "a" ? 1 : p.ganador === "b" ? 0 : 0.5;
    const da = kDe(A.partidas) * (sa - ea);
    const db = kDe(B.partidas) * ((1 - sa) - (1 - ea));
    A.elo += da; B.elo += db; A.ultimo = da; B.ultimo = db;
    A.partidas++; B.partidas++;
    if (sa === 1) { A.w++; B.l++; } else if (sa === 0) { A.l++; B.w++; } else { A.t++; B.t++; }
  }
  return [...f.values()]
    .map((x) => ({ ...x, elo: Math.round(x.elo), ultimo: Math.round(x.ultimo), provisional: x.partidas < PROVISIONAL }))
    .sort((a, b) => Number(a.provisional) - Number(b.provisional) || b.elo - a.elo || b.partidas - a.partidas);
}
