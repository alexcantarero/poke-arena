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
 * v0.22 — Series del Elo de la liga a partir de `eloTable().history`. El
 * primer punto de cada historial es el valor inicial sin fecha y se salta;
 * varias partidas el mismo día se separan un minuto para que se vean en orden.
 */
export function seriesElo(history: Record<string, Array<{ date: string; value: number }>>): Map<string, PuntoSerie[]> {
  const out = new Map<string, PuntoSerie[]>();
  for (const [id, h] of Object.entries(history)) {
    const puntos: PuntoSerie[] = [];
    let ultimoDia = "", n = 0;
    for (const p of h) {
      if (!p.date) continue;
      n = p.date === ultimoDia ? n + 1 : 0;
      ultimoDia = p.date;
      puntos.push({ t: new Date(`${p.date}T12:00:00Z`).getTime() + n * 60_000, elo: Math.round(p.value) });
    }
    if (puntos.length) out.set(id, puntos);
  }
  return out;
}
