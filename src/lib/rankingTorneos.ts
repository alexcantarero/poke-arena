/* =========================================================================
   v0.15 — El ranking de torneos.

   POR QUÉ HACÍA FALTA
   -------------------
   El ranking de siempre sale de `standings()`, que solo cuenta partidas entre
   DOS personas de la liga (las únicas con las que se puede calcular Elo y
   resistencia). Las rondas de un torneo son contra gente de fuera, así que al
   elegir «Presenciales» u «Online» la tabla salía entera a cero: el filtro sí
   funcionaba, pero lo que quedaba no lo sabía leer nadie.

   Esto lee lo que de verdad hay de un torneo: el resultado de cada uno y sus
   rondas. Por persona da:

   · torneos jugados,
   · V–D–E y % de victorias de las rondas,
   · conversión al top cut — solo sobre torneos que TENÍAN corte, igual que
     `tournamentStats.ts`; un Challenge sin corte no es un corte fallado,
   · puesto medio y mejor puesto — solo sobre los que tienen puesto,
   · CP, que se calculan fuera (con el Best Finish Limit) y entran por
     parámetro.

   Sin imports, como el resto de módulos probados.
   ========================================================================= */

export type EntradaTorneo = {
  playerId: string;
  tournamentId: string;
  placement: number | null;
  /** 0 o null = sin corte. */
  topCut: number | null;
  wins: number;
  losses: number;
  ties: number;
  dropped?: boolean;
};

export type FilaRankingTorneos = {
  playerId: string;
  torneos: number;
  wins: number;
  losses: number;
  ties: number;
  rondas: number;
  winRate: number | null;
  /** Torneos con corte y puesto. Denominador de `cutRate`. */
  conCorte: number;
  cortes: number;
  cutRate: number | null;
  conPuesto: number;
  avgPlacement: number | null;
  bestPlacement: number | null;
  drops: number;
  cp: number;
};

export function rankingTorneos(
  entradas: EntradaTorneo[],
  cpDe: (playerId: string) => number = () => 0,
): FilaRankingTorneos[] {
  const por = new Map<string, EntradaTorneo[]>();
  for (const e of entradas) {
    const l = por.get(e.playerId);
    if (l) l.push(e); else por.set(e.playerId, [e]);
  }

  const filas: FilaRankingTorneos[] = [];
  for (const [playerId, lista] of por) {
    // Un torneo cuenta una vez aunque llegue repetido.
    const unicos = [...new Map(lista.map((e) => [e.tournamentId, e])).values()];
    const wins = unicos.reduce((a, e) => a + e.wins, 0);
    const losses = unicos.reduce((a, e) => a + e.losses, 0);
    const ties = unicos.reduce((a, e) => a + e.ties, 0);
    const rondas = wins + losses + ties;
    const conPuesto = unicos.filter((e) => e.placement != null && e.placement > 0);
    const corte = conPuesto.filter((e) => (e.topCut ?? 0) > 0);
    const cortes = corte.filter((e) => (e.placement as number) <= (e.topCut as number)).length;
    const puestos = conPuesto.map((e) => e.placement as number);
    filas.push({
      playerId,
      torneos: unicos.length,
      wins, losses, ties, rondas,
      winRate: rondas ? (wins + ties * 0.5) / rondas : null,
      conCorte: corte.length,
      cortes,
      cutRate: corte.length ? cortes / corte.length : null,
      conPuesto: conPuesto.length,
      avgPlacement: puestos.length ? puestos.reduce((a, b) => a + b, 0) / puestos.length : null,
      bestPlacement: puestos.length ? Math.min(...puestos) : null,
      drops: unicos.filter((e) => e.dropped).length,
      cp: cpDe(playerId),
    });
  }

  // Orden por defecto: CP, después conversión, después %V, después torneos.
  return filas.sort((a, b) =>
    b.cp - a.cp
    || (b.cutRate ?? -1) - (a.cutRate ?? -1)
    || (b.winRate ?? -1) - (a.winRate ?? -1)
    || b.torneos - a.torneos
    || a.playerId.localeCompare(b.playerId));
}
