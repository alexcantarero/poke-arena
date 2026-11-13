/* =========================================================================
   v0.90 — El resumen de tu torneo (al cerrarlo): récord, y el mejor y el peor
   emparejamiento de los que jugaste. Sin imports, para probarlo.
   ========================================================================= */
export type RondaResumen = { rival: string; nombre: string; r: "w" | "l" | "t" };
export type Cruce = { rival: string; nombre: string; w: number; l: number; t: number };

export function resumenTorneo(rondas: RondaResumen[]) {
  const w = rondas.filter((x) => x.r === "w").length;
  const l = rondas.filter((x) => x.r === "l").length;
  const t = rondas.filter((x) => x.r === "t").length;
  const por = new Map<string, Cruce>();
  for (const x of rondas) {
    if (!x.rival) continue;
    const c = por.get(x.rival) ?? { rival: x.rival, nombre: x.nombre, w: 0, l: 0, t: 0 };
    c[x.r]++;
    por.set(x.rival, c);
  }
  const saldo = (c: Cruce) => (c.w - c.l) / (c.w + c.l + c.t);
  const lista = [...por.values()];
  const mejor = [...lista].filter((c) => c.w > 0).sort((a, b) => saldo(b) - saldo(a) || b.w - a.w)[0] ?? null;
  const peor = [...lista].filter((c) => c.l > 0).sort((a, b) => saldo(a) - saldo(b) || b.l - a.l)[0] ?? null;
  return { w, l, t, mejor, peor: peor && mejor && peor.rival === mejor.rival ? null : peor };
}

/* =========================================================================
   v0.129 — El informe post-torneo: además del récord, TODAS las rondas con el
   mazo de enfrente y el Elo que te llevaste.
   ========================================================================= */

/** Un punto del historial de Elo (lo que hace falta de él). */
export type PuntoElo = { delta?: number | null; matchId?: string | null; tournamentId?: string | null; bonus?: boolean };

/**
 * El Elo ganado (o perdido) en un torneo: lo de sus rondas más los bonus por
 * puesto de ese torneo. null si el torneo no movió tu Elo (nada que enseñar).
 */
export function eloDeTorneo(
  historial: readonly PuntoElo[], torneoId: string, idsDeRondas: ReadonlySet<string>,
): { total: number; rondas: number; bonus: number } | null {
  let rondas = 0, bonus = 0, hay = false;
  for (const h of historial) {
    if (typeof h.delta !== "number") continue;
    if (h.bonus && h.tournamentId === torneoId) { bonus += h.delta; hay = true; }
    else if (h.matchId && idsDeRondas.has(h.matchId)) { rondas += h.delta; hay = true; }
  }
  return hay ? { total: Math.round(rondas + bonus), rondas: Math.round(rondas), bonus: Math.round(bonus) } : null;
}

/** Las rondas repartidas en columnas para la imagen: hasta 8 por columna, dos como mucho (16 rondas). */
export function columnasDeRondas<T>(rondas: readonly T[], porColumna = 8): T[][] {
  const visibles = rondas.slice(0, porColumna * 2);
  if (visibles.length <= porColumna) return [visibles];
  const mitad = Math.ceil(visibles.length / 2);
  return [visibles.slice(0, mitad), visibles.slice(mitad)];
}
