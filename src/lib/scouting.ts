/* =========================================================================
   v0.130 — SCOUTING DEL GRUPO: cómo te va contra cada rival habitual y qué
   juega últimamente.

   Sin imports, para probarlo.

   PRIVACIDAD (decisión de Ibai, 13/11/2026): cada uno ve SOLO SUS PROPIOS
   cruces. Esta función recibe únicamente partidas en las que juega quien
   mira; la página (`/rivales`) no acepta el id de otro jugador. Lo que juega
   cada rival últimamente sí es de todos: ya se ve en los torneos.

   Una misma partida puede venir dos veces (una ronda de torneo entre dos del
   grupo la puede apuntar cada uno desde su lado): se deduplica por `clave`, y
   manda la primera, así que quien llama pone delante las suyas.
   ========================================================================= */

export type EncuentroPropio = {
  clave: string;
  rivalId: string;
  /** ISO (AAAA-MM-DD). */
  fecha: string;
  /** Desde mi lado. */
  r: "w" | "l" | "t";
  /** Nombre de mi mazo y del suyo; vacío si no se sabe. */
  miMazo: string;
  suMazo: string;
};

export type MarcaScouting = { w: number; l: number; t: number };
export type FichaRival = MarcaScouting & {
  rivalId: string;
  partidas: number;
  /** (victorias + medio empate) / partidas. */
  pct: number;
  /** Los últimos resultados, del más reciente al más antiguo (hasta 6). */
  ultimos: Array<"w" | "l" | "t">;
  /** La racha actual: cuántas seguidas del mismo signo, desde la última. */
  racha: { r: "w" | "l" | "t"; n: number };
  ultima: string;
  /** Tu marca según el mazo que llevaba él, y según el que llevabas tú (los más jugados primero). */
  porSuMazo: Array<MarcaScouting & { mazo: string }>;
  porMiMazo: Array<MarcaScouting & { mazo: string }>;
};

function porMazo(es: readonly EncuentroPropio[], campo: "miMazo" | "suMazo"): Array<MarcaScouting & { mazo: string }> {
  const m = new Map<string, MarcaScouting & { mazo: string }>();
  for (const e of es) {
    const mazo = e[campo];
    if (!mazo) continue;
    const x = m.get(mazo) ?? { mazo, w: 0, l: 0, t: 0 };
    x[e.r]++;
    m.set(mazo, x);
  }
  return [...m.values()].sort((a, b) => (b.w + b.l + b.t) - (a.w + a.l + a.t) || a.mazo.localeCompare(b.mazo, "es"));
}

export function fichasDeRivales(encuentros: readonly EncuentroPropio[]): FichaRival[] {
  const vistos = new Set<string>();
  const porRival = new Map<string, EncuentroPropio[]>();
  for (const e of encuentros) {
    if (!e.rivalId || vistos.has(e.clave)) continue;
    vistos.add(e.clave);
    const l = porRival.get(e.rivalId);
    if (l) l.push(e); else porRival.set(e.rivalId, [e]);
  }
  const out: FichaRival[] = [];
  for (const [rivalId, lista] of porRival) {
    // Del más reciente al más antiguo; a igual fecha, en el orden en que llegaron al revés.
    const es = lista.map((e, i) => ({ e, i })).sort((a, b) => b.e.fecha.localeCompare(a.e.fecha) || b.i - a.i).map((x) => x.e);
    const w = es.filter((e) => e.r === "w").length, l = es.filter((e) => e.r === "l").length, t = es.filter((e) => e.r === "t").length;
    let n = 0;
    while (n < es.length && es[n].r === es[0].r) n++;
    out.push({
      rivalId, w, l, t, partidas: es.length, pct: (w + t / 2) / es.length,
      ultimos: es.slice(0, 6).map((e) => e.r), racha: { r: es[0].r, n }, ultima: es[0].fecha,
      porSuMazo: porMazo(es, "suMazo"), porMiMazo: porMazo(es, "miMazo"),
    });
  }
  return out.sort((a, b) => b.partidas - a.partidas || b.ultima.localeCompare(a.ultima) || a.rivalId.localeCompare(b.rivalId));
}

/** Lo que juega cada uno últimamente: sus mazos desde `desde`, del más usado al menos (hasta `top`). */
export function mazosRecientes(
  usos: ReadonlyArray<{ playerId: string; mazo: string; fecha: string }>, desde: string, top = 3,
): Record<string, Array<{ mazo: string; n: number }>> {
  const m = new Map<string, Map<string, number>>();
  for (const u of usos) {
    if (!u.mazo || u.fecha < desde) continue;
    const x = m.get(u.playerId) ?? new Map<string, number>();
    x.set(u.mazo, (x.get(u.mazo) ?? 0) + 1);
    m.set(u.playerId, x);
  }
  const out: Record<string, Array<{ mazo: string; n: number }>> = {};
  for (const [id, x] of m) {
    out[id] = [...x.entries()].map(([mazo, n]) => ({ mazo, n })).sort((a, b) => b.n - a.n || a.mazo.localeCompare(b.mazo, "es")).slice(0, top);
  }
  return out;
}
