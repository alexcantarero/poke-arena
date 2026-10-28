import "server-only";
import { loadMetaIrl, type Snapshot } from "@/lib/data";
import { fetchMatrizMeta } from "@/lib/sources/limitless";
import { archetypesOfMatch, isPlayed, outcome } from "@/lib/stats";
import { parseDeckList } from "@/lib/decklist";
import { deckSizeOf, estimateBasics, mulliganChance } from "@/lib/mulligan";
import { liderDe, type Cruce, type Fuente, type TipoTorneo } from "@/lib/recomendador";

/* =========================================================================
   v0.74 — Los datos del recomendador, ya agregados por Pokémon líder.

   Fuentes (cada una con lo que sabe):
     · online       — Limitless API: partidas reales (casi todas al mejor de 1)
                      de los torneos online de los últimos 30 días. Cuota y
                      emparejamientos. La mejor fuente de cruces.
     · regionales   — Regionales, Internacionales y Specials importados
                      (últimos 120 días): cuota y conversión al corte.
     · cityleagues  — City Leagues de Japón importadas (suizo al mejor de 1 +
                      top 8): cuota y conversión. Lo más parecido a una Cup.
     · grupo        — vuestros torneos DE ESE TIPO: los mazos de los rivales en
                      vuestras rondas (el campo local de verdad) y los cruces.
   Nada se inventa: una fuente sin datos simplemente no pesa.
   ========================================================================= */

export type DatosRecomendador = {
  fuentes: Record<"online" | "regionales" | "cityleagues", Fuente>;
  grupo: Record<TipoTorneo, Fuente>;
  /** líder → consistencia: mulligan teórico (de las listas) y real (de vuestros juegos). */
  consistencia: Record<string, { teorico: number | null; mull: number; juegos: number }>;
  /** líder → nombre legible (el más usado). */
  nombres: Record<string, string>;
  resumen: { online: { torneos: number; partidas: number } | null; regionales: number; cityleagues: number };
};

const KINDS: Record<TipoTorneo, string[]> = {
  league_challenge: ["league_challenge", "pokemon_challenge"],
  league_cup: ["league_cup", "pokemon_cup"],
  regional: ["regional", "special", "international"],
  city_league: [],
};

export async function cargarDatosRecomendador(snap: Snapshot): Promise<DatosRecomendador> {
  const nombres: Record<string, string> = {};
  const nombrar = (lider: string, nombre: string) => { if (lider && !nombres[lider]) nombres[lider] = nombre; };

  /* --- online --------------------------------------------------------- */
  const online: Fuente = { id: "online", cuota: {}, cruces: [] };
  let resOnline: DatosRecomendador["resumen"]["online"] = null;
  try {
    const m = await fetchMatrizMeta({ days: 30, top: 40, minPartidas: 10, apiKey: process.env.LIMITLESS_API_KEY });
    const lid = (id: string) => {
      const ref = m.acc.mazos.get(id);
      const l = ref?.icons?.[0] || liderDe(ref?.name ?? id);
      if (ref) nombrar(l, ref.name);
      return l;
    };
    const cruces = new Map<string, Cruce>();
    for (const [a, fila] of m.acc.celdas) {
      for (const [b, c] of fila) {
        const la = lid(a), lb = lid(b);
        if (!la || !lb) continue;
        online.cuota[la] = (online.cuota[la] ?? 0) + c.w + c.l + c.t;
        if (la === lb) continue;
        const k = `${la}|${lb}`;
        const x = cruces.get(k) ?? { a: la, b: lb, w: 0, l: 0, t: 0 };
        x.w += c.w; x.l += c.l; x.t += c.t;
        cruces.set(k, x);
      }
    }
    // Cada partida aparece en la fila de los dos mazos: para no contarla dos veces, solo A<B.
    online.cruces = [...cruces.values()].filter((c) => c.a < c.b || !cruces.has(`${c.b}|${c.a}`));
    resOnline = { torneos: m.torneos, partidas: m.acc.partidas };
  } catch { /* Limitless caído: la fuente queda vacía y no pesa */ }

  /* --- regionales y City Leagues importados -------------------------- */
  const regionales: Fuente = { id: "regionales", cuota: {}, conversion: {} };
  const cityleagues: Fuente = { id: "cityleagues", cuota: {}, conversion: {} };
  let nReg = 0, nCity = 0;
  try {
    const { events, entries } = await loadMetaIrl();
    const desde = new Date(Date.now() - 120 * 86400000).toISOString().slice(0, 10);
    const evById = new Map(events.filter((e) => e.date >= desde).map((e) => [e.id, e]));
    for (const en of entries) {
      const ev = evById.get(en.eventId);
      if (!ev) continue;
      const f = ev.kind === "city_league" ? cityleagues : ["regional", "special", "international"].includes(ev.kind) ? regionales : null;
      if (!f) continue;
      const l = en.main || liderDe(en.archetypeName);
      if (!l) continue;
      nombrar(l, en.archetypeName);
      f.cuota[l] = (f.cuota[l] ?? 0) + en.copies;
      if (en.placement != null) {
        const corte = ev.topCut ?? (ev.kind === "city_league" ? 8 : 0);
        const x = f.conversion![l] ?? { n: 0, corte: 0 };
        x.n += 1;
        if (corte && en.placement <= corte) x.corte += 1;
        f.conversion![l] = x;
      }
    }
    nReg = [...evById.values()].filter((e) => e.kind !== "city_league").length;
    nCity = [...evById.values()].filter((e) => e.kind === "city_league").length;
  } catch { /* sin tablas o sin datos: vacías */ }

  /* --- vuestros torneos, por tipo ------------------------------------ */
  const ldArch = (a?: { main?: string | null; name?: string }) => (a ? a.main || liderDe(a.name) : "");
  const grupo = {} as Record<TipoTorneo, Fuente>;
  for (const tipo of Object.keys(KINDS) as TipoTorneo[]) {
    const kinds = new Set(KINDS[tipo]);
    const tours = new Set(snap.tournaments.filter((t) => kinds.has(t.kind)).map((t) => t.id));
    const f: Fuente = { id: "grupo", cuota: {}, cruces: [] };
    const cruces = new Map<string, Cruce>();
    for (const m of snap.matches) {
      if (!m.tournamentId || !tours.has(m.tournamentId) || !isPlayed(m)) continue;
      const { a, b } = archetypesOfMatch(m, snap.archIndex, snap.archById);
      const la = ldArch(a), lb = ldArch(b);
      if (lb) { f.cuota[lb] = (f.cuota[lb] ?? 0) + 1; nombrar(lb, b!.name); } // el rival: el campo local
      if (!la || !lb || la === lb) continue;
      nombrar(la, a!.name);
      const o = outcome(m).winner;
      const x = cruces.get(`${la}|${lb}`) ?? { a: la, b: lb, w: 0, l: 0, t: 0 };
      if (o === "a") x.w++; else if (o === "b") x.l++; else if (o === "tie") x.t++;
      cruces.set(`${la}|${lb}`, x);
    }
    f.cruces = [...cruces.values()];
    grupo[tipo] = f;
  }

  /* --- consistencia ---------------------------------------------------- */
  const consistencia: DatosRecomendador["consistencia"] = {};
  const teoricos: Record<string, number[]> = {};
  for (const d of snap.decks) {
    if (!d.list?.trim()) continue;
    const l = ldArch(snap.archIndex.get(d.id));
    if (!l) continue;
    try {
      const deck = parseDeckList(d.list);
      const n = deckSizeOf(deck);
      if (n >= 40) (teoricos[l] ??= []).push(mulliganChance(estimateBasics(deck), n));
    } catch { /* lista que no se entiende: no cuenta */ }
  }
  for (const m of snap.matches) {
    if (!isPlayed(m) || !m.games.length) continue;
    const { a, b } = archetypesOfMatch(m, snap.archIndex, snap.archById);
    for (const [arch, lado] of [[a, "A"], [b, "B"]] as const) {
      const l = ldArch(arch);
      if (!l) continue;
      const x = consistencia[l] ?? { teorico: null, mull: 0, juegos: 0 };
      for (const g of m.games) { x.juegos++; if ((lado === "A" ? g.mulligansA : g.mulligansB) > 0) x.mull++; }
      consistencia[l] = x;
    }
  }
  for (const [l, ps] of Object.entries(teoricos)) {
    const x = consistencia[l] ?? { teorico: null, mull: 0, juegos: 0 };
    x.teorico = ps.reduce((s, p) => s + p, 0) / ps.length;
    consistencia[l] = x;
  }

  return {
    fuentes: { online, regionales, cityleagues }, grupo, consistencia, nombres,
    resumen: { online: resOnline, regionales: nReg, cityleagues: nCity },
  };
}
