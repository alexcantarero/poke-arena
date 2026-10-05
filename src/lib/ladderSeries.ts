/* =========================================================================
   v0.19 — Series de la gráfica del ladder.

   Una serie por jugador con TODOS sus cambios de rango, en orden. En cada
   reset de temporada se mete un hueco (`elo: null`) para que la línea no una
   el final de una temporada con el principio de la siguiente: tras un reset
   todo el mundo vuelve a cero y esa raya inventaría una caída que no fue.

   Sin imports: lo cargan los tests.
   ========================================================================= */

export type PuntoSerie = { t: number; elo: number | null };

export function seriesLadder(
  entries: Array<{ playerId: string; elo: number; at: Date | string }>,
  resets: Array<Date | string>,
): Map<string, PuntoSerie[]> {
  const cortes = resets.map((r) => new Date(r).getTime()).sort((a, b) => a - b);
  const porJugador = new Map<string, Array<{ t: number; elo: number }>>();
  for (const e of entries) {
    const t = new Date(e.at).getTime();
    const l = porJugador.get(e.playerId);
    if (l) l.push({ t, elo: e.elo }); else porJugador.set(e.playerId, [{ t, elo: e.elo }]);
  }
  const out = new Map<string, PuntoSerie[]>();
  for (const [id, puntos] of porJugador) {
    puntos.sort((a, b) => a.t - b.t);
    const serie: PuntoSerie[] = [];
    let c = 0;
    for (const p of puntos) {
      // Resets que caen antes de este punto: hueco, si ya había algo pintado.
      let corte = false;
      while (c < cortes.length && cortes[c] <= p.t) { corte = true; c++; }
      if (corte && serie.length && serie[serie.length - 1].elo !== null) {
        serie.push({ t: cortes[c - 1], elo: null });
      }
      serie.push(p);
    }
    out.set(id, serie);
  }
  return out;
}

/**
 * v0.24 — Series del Elo de la liga sobre el ORDEN de las partidas.
 *
 * La v0.22 ponía el eje X en fechas reales y casi todo caía el mismo día (un
 * torneo son 8 rondas en una tarde): salían columnas de puntos apilados y
 * saltos. Ahora el eje X es el nº de partida de la liga (1, 2, 3…), igual
 * para todos, así que cada línea avanza partida a partida y se conecta bien;
 * las fechas van en las etiquetas del eje (`fechas`). El valor inicial (sin
 * fecha) entra como punto 0 para que cada línea arranque en el Elo inicial.
 */
export function seriesElo(history: Record<string, Array<{ date: string; value: number; i?: number }>>): {
  series: Map<string, PuntoSerie[]>; fechas: Array<[number, string]>;
} {
  const series = new Map<string, PuntoSerie[]>();
  const fechas = new Map<number, string>();
  for (const [id, h] of Object.entries(history)) {
    const puntos: PuntoSerie[] = [];
    for (const p of h) {
      if (!p.date) continue;
      const x = p.i ?? 0;
      if (!puntos.length) puntos.push({ t: Math.max(0, x - 1), elo: Math.round(h[0]?.date ? p.value : h[0]!.value) });
      puntos.push({ t: x, elo: Math.round(p.value) });
      if (!fechas.has(x)) fechas.set(x, p.date);
    }
    if (puntos.length) series.set(id, puntos);
  }
  return { series, fechas: [...fechas.entries()].sort((a, b) => a[0] - b[0]) };
}
