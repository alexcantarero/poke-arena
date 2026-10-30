import "server-only";
import { loadMatchupImports, loadMetaIrl, type Snapshot } from "@/lib/data";
import { liderDeSlug, type FilaTH } from "@/lib/trainerHill";
import { estructuraDe } from "@/lib/estructura";
import { arquetipos as arquetiposCm, catalogo as catalogoCm } from "@/lib/sources/ciphermaniac";
import { comb } from "@/lib/herramientas";
import { fetchMatrizMeta } from "@/lib/sources/limitless";
import { archetypesOfMatch, isPlayed, outcome, sideOf } from "@/lib/stats";
import { parseDeckList } from "@/lib/decklist";
import { deckSizeOf, estimateBasics, mulliganChance } from "@/lib/mulligan";
import { ajustesPersonales, alMejorDe3, conversionDia2, pModelo, evaluar, type RegistroPersonal, liderDe, pPartida, tablaCruces, type Cruce, type Evaluacion, type Fuente, type Muestra, type TipoTorneo, type Variante } from "@/lib/recomendador";

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
  /** v0.79 — emparejamientos importados de Trainer Hill, uno por nivel (`th_majors`, `th_online`, `th_mixto`). */
  trainerHill: Fuente[];
  grupo: Record<TipoTorneo, Fuente>;
  /** líder → consistencia: mulligan teórico (de las listas) y real (de vuestros juegos). */
  consistencia: Record<string, { teorico: number | null; mull: number; juegos: number }>;
  /** líder → nombre legible (el más usado). */
  nombres: Record<string, string>;
  /** v0.80 — líder → sprites, para los arquetipos sin Pokémon en el nombre (Basic Box…). */
  iconos: Record<string, string[]>;
  resumen: { online: { torneos: number; partidas: number } | null; regionales: number; cityleagues: number; trainerHill: number; eventosDia2: number };
  /** v0.75 — líder → sus variantes (líder + compañero), con lo que rinde cada una. */
  variantes: Record<string, Variante[]>;
  /** v0.75 — el acierto del modelo en vuestras partidas y la calibración aprendida. */
  evaluacion: Evaluacion;
  /** Conversión media al corte de los presenciales (base para comparar variantes). */
  tasaCampo: number | null;
  /** v0.76 — líder → victorias y derrotas en TCG Live (de las fichas de los mazos). */
  live: Record<string, { w: number; l: number }>;
  /** v0.77 — lo tuyo, para el modo personalizado (null sin sesión). */
  personal: {
    /** líder → cuánto rindes por encima de lo esperado, y tu récord con él. */
    porLider: ReturnType<typeof ajustesPersonales>;
    /** Tus partidas como fuente de emparejamientos («yo»). */
    fuente: Fuente;
    /** Líderes de los que tienes mazo. */
    misLideres: string[];
  } | null;
};

const KINDS: Record<TipoTorneo, string[]> = {
  league_challenge: ["league_challenge", "pokemon_challenge"],
  league_cup: ["league_cup", "pokemon_cup"],
  regional: ["regional", "special", "international"],
  city_league: [],
};

export async function cargarDatosRecomendador(snap: Snapshot, meId?: string | null): Promise<DatosRecomendador> {
  const nombres: Record<string, string> = {};
  const iconos: Record<string, string[]> = {};
  const variantes: Record<string, Map<string, Variante>> = {};
  const variante = (lider: string, segundo: string, nombre: string) => {
    const clave = segundo && segundo !== lider ? `${lider}|${segundo}` : lider;
    const m = (variantes[lider] ??= new Map());
    let v = m.get(clave);
    if (!v) m.set(clave, (v = { clave, nombre, w: 0, l: 0, t: 0, listas: 0, corte: 0, conPuesto: 0 }));
    return v;
  };
  const nombrar = (lider: string, nombre: string) => { if (lider && !nombres[lider]) nombres[lider] = nombre; };

  /* --- online --------------------------------------------------------- */
  const online: Fuente = { id: "online", cuota: {}, cruces: [] };
  let resOnline: DatosRecomendador["resumen"]["online"] = null;
  try {
    /* v0.76 — más historia online: 45 días y hasta 40 torneos (cada uno se
       pide una vez y queda en caché 6 horas). */
    const m = await fetchMatrizMeta({ days: 45, limit: 40, top: 60, minPartidas: 10, apiKey: process.env.LIMITLESS_API_KEY });
    const lid = (id: string) => {
      const ref = m.acc.mazos.get(id);
      // v0.79 — los arquetipos con nombre propio (Basic Box, Festival Lead) por su
      // nombre, como en Trainer Hill; el resto, por el primer Pokémon.
      const especial = /^(basic-box|festival-lead|lost-box|future-box|ancient-box)/.test(id);
      const l = especial ? liderDeSlug(id).lider : ref?.icons?.[0] || liderDe(ref?.name ?? id);
      if (especial && ref?.icons?.length && !iconos[l]) iconos[l] = ref.icons.slice(0, 2);
      if (ref) nombrar(l, ref.name);
      return l;
    };
    const cruces = new Map<string, Cruce>();
    for (const [a, fila] of m.acc.celdas) {
      const ref = m.acc.mazos.get(a);
      const la0 = lid(a);
      const v = la0 ? variante(la0, ref?.icons?.[1] ?? "", ref?.name ?? la0) : null;
      for (const [b, c] of fila) {
        const la = lid(a), lb = lid(b);
        if (!la || !lb) continue;
        if (v && la !== lb) { v.w += c.w; v.l += c.l; v.t += c.t; }
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
    /* v0.82 — Día 2: cuántos pasan en un Regional de N jugadores (fase 1 de la
       estructura oficial, todos con la misma fuerza: P(3·V ≥ umbral)). Solo se
       usa si lo importado llega MÁS ALLÁ del Día 2; si solo están las listas de
       Día 2, todas «pasarían» y la cifra no diría nada. */
    const listasPorEvento = new Map<string, number>();
    for (const en of entries) listasPorEvento.set(en.eventId, (listasPorEvento.get(en.eventId) ?? 0) + 1);
    const tamDia2 = new Map<string, number>();
    for (const e of evById.values()) {
      if (!e.playerCount || !["regional", "special", "international"].includes(e.kind)) continue;
      const est = estructuraDe(e.playerCount, "regional");
      if (!est || est.umbral == null) continue;
      let frac = 0;
      for (let v = 0; v <= est.fase1; v++) if (3 * v >= est.umbral) frac += comb(est.fase1, v) / 2 ** est.fase1;
      const tam = Math.round(e.playerCount * frac);
      if ((listasPorEvento.get(e.id) ?? 0) > tam * 1.05) tamDia2.set(e.id, tam);
    }
    for (const en of entries) {
      const ev = evById.get(en.eventId);
      if (!ev) continue;
      const f = ev.kind === "city_league" ? cityleagues : ["regional", "special", "international"].includes(ev.kind) ? regionales : null;
      if (!f) continue;
      const l = en.main || liderDe(en.archetypeName);
      if (!l) continue;
      nombrar(l, en.archetypeName);
      f.cuota[l] = (f.cuota[l] ?? 0) + en.copies;
      const vv = variante(l, en.secondary, en.archetypeName);
      vv.listas += en.copies;
      if (en.placement != null) {
        const corte = ev.topCut ?? (ev.kind === "city_league" ? 8 : 0);
        const x = f.conversion![l] ?? { n: 0, corte: 0, top4: 0, ganados: 0 };
        x.n += 1;
        if (corte && en.placement <= corte) x.corte += 1;
        if (en.placement <= 4) x.top4 = (x.top4 ?? 0) + 1;
        if (en.placement === 1) x.ganados = (x.ganados ?? 0) + 1;
        const t2 = tamDia2.get(ev.id);
        if (t2) { x.dia2Base = (x.dia2Base ?? 0) + 1; if (en.placement <= t2) x.dia2 = (x.dia2 ?? 0) + 1; }
        f.conversion![l] = x;
        vv.conPuesto += 1;
        if (corte && en.placement <= corte) vv.corte += 1;
      }
    }
    nReg = [...evById.values()].filter((e) => e.kind !== "city_league").length;
    nCity = [...evById.values()].filter((e) => e.kind === "city_league").length;
  } catch { /* sin tablas o sin datos: vacías */ }

  /* --- Día 2 desde Ciphermaniac (v0.84) ---------------------------------
     Limitless y las importaciones de la web solo traen las listas de Día 2.
     Ciphermaniac publica el evento ENTERO y su «fase 2»: con los dos recuentos
     sale la conversión real al Día 2 por mazo. Hasta 6 eventos de los últimos
     120 días; si su servidor no responde, se sigue sin esto. */
  let eventosDia2 = 0;
  try {
    const cat = await catalogoCm();
    if (cat.ok) {
      const desde = new Date(Date.now() - 120 * 86400000).toISOString().slice(0, 10);
      const evs = cat.datos.filter((n) => /regional|international|special/i.test(n) && n.slice(0, 10) >= desde).slice(0, 6);
      const aLider = (x: { slug: string; nombre: string; listas: number | null }) => ({
        lider: liderDeSlug(x.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-")).lider,
        listas: x.listas ?? 0,
      });
      for (const ev of evs) {
        const [todos, fase2] = await Promise.all([arquetiposCm(ev), arquetiposCm(ev, "phase2")]);
        if (!todos.ok || !fase2.ok) continue;
        const conv = conversionDia2(todos.datos.map(aLider), fase2.datos.map(aLider));
        if (!conv) continue;
        eventosDia2++;
        for (const [l, x] of Object.entries(conv)) {
          const y = (regionales.conversion![l] ??= { n: 0, corte: 0, top4: 0, ganados: 0 });
          y.dia2 = (y.dia2 ?? 0) + x.dia2;
          y.dia2Base = (y.dia2Base ?? 0) + x.base;
        }
      }
    }
  } catch { /* Ciphermaniac caído: sin Día 2 */ }

  /* --- Trainer Hill (v0.79): los CSV importados ----------------------- */
  const trainerHill: Fuente[] = [];
  let partidasTH = 0;
  for (const im of await loadMatchupImports()) {
    const filas = (Array.isArray(im.filas) ? im.filas : []) as FilaTH[];
    const f: Fuente = { id: `th_${im.nivel}`, cuota: {}, cruces: [] };
    for (const x of filas) {
      if (!x.lider1 || !x.lider2) continue;
      const n = x.w + x.l + x.t;
      f.cuota[x.lider1] = (f.cuota[x.lider1] ?? 0) + n;
      f.cuota[x.lider2] = (f.cuota[x.lider2] ?? 0) + n;
      nombrar(x.lider1, x.deck1); nombrar(x.lider2, x.deck2);
      // Variantes: cada nombre de Trainer Hill es una (líder + compañero).
      const v1 = variante(x.lider1, liderDeSlug(x.deck1).segundo, x.deck1);
      const v2 = variante(x.lider2, liderDeSlug(x.deck2).segundo, x.deck2);
      if (x.lider1 !== x.lider2) {
        v1.w += x.w; v1.l += x.l; v1.t += x.t;
        v2.w += x.l; v2.l += x.w; v2.t += x.t;
        f.cruces!.push({ a: x.lider1, b: x.lider2, w: x.w, l: x.l, t: x.t });
      }
    }
    partidasTH += im.partidas;
    trainerHill.push(f);
  }

  /* --- vuestros torneos, por tipo ------------------------------------ */
  const ldArch = (a?: { main?: string | null; name?: string }) => (a ? a.main || liderDe(a.name) : "");
  const grupo = {} as Record<TipoTorneo, Fuente>;
  for (const tipo of Object.keys(KINDS) as TipoTorneo[]) {
    const kinds = new Set(KINDS[tipo]);
    const tours = new Set(snap.tournaments.filter((t) => kinds.has(t.kind)).map((t) => t.id));
    // v1.0 — los cruces de vuestros torneos son resultados de SERIE (ganar la ronda), no partidas.
    const f: Fuente = { id: "grupo", cuota: {}, cruces: [], serie: true };
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
    /* v0.82 — vuestros RESULTADOS en ese tipo de torneo (puesto y mazo): si
       entrasteis al corte (sin corte, top 8) y si lo ganasteis. */
    f.conversion = {};
    for (const t of snap.tournaments) {
      if (!kinds.has(t.kind)) continue;
      const corte = t.topCut || 8;
      for (const r of t.results) {
        if (r.placement == null) continue;
        const arch = (r.deckId ? snap.archIndex.get(r.deckId) : undefined) ?? (r.archetypeId ? snap.archById.get(r.archetypeId) : undefined);
        const l = ldArch(arch);
        if (!l) continue;
        const x = (f.conversion[l] ??= { n: 0, corte: 0, top4: 0, ganados: 0 });
        x.n++;
        if (r.placement <= corte) x.corte++;
        if (r.placement <= 4) x.top4 = (x.top4 ?? 0) + 1;
        if (r.placement === 1) x.ganados = (x.ganados ?? 0) + 1;
      }
    }
    grupo[tipo] = f;
  }

  /* --- TCG Live (v0.76): lo apuntado a mano en cada mazo, por líder -------- */
  const live: Record<string, { w: number; l: number }> = {};
  for (const d of snap.decks) {
    if (!d.liveWins && !d.liveLosses) continue;
    const l = ldArch(snap.archIndex.get(d.id));
    if (!l) continue;
    const x = live[l] ?? { w: 0, l: 0 };
    x.w += d.liveWins ?? 0; x.l += d.liveLosses ?? 0;
    live[l] = x;
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

  /* --- el acierto: vuestras partidas, predichas solo con fuentes de fuera ---
     Cada partida jugada con los dos mazos conocidos (liga y torneos) es una
     prueba: qué % daba el modelo al de la izquierda y si ganó. Solo cruces con
     al menos 5 partidas de fuera; si no, el modelo diría «50 %» y no enseña nada. */
  const fuera = tablaCruces([online, regionales, cityleagues, ...trainerHill]);
  const muestras: Muestra[] = [];
  for (const m of snap.matches) {
    if (!isPlayed(m)) continue;
    const { a, b } = archetypesOfMatch(m, snap.archIndex, snap.archById);
    const la = ldArch(a), lb = ldArch(b);
    if (!la || !lb || la === lb) continue;
    const { p, n } = pPartida(fuera, la, lb);
    if (n < 5) continue;
    const w = outcome(m).winner;
    // v0.84 — el mismo paso que usa el recomendador (`pModelo`), para que α sea coherente.
    const pm = pModelo(p);
    muestras.push({ p: (m.bestOf ?? 1) >= 3 ? alMejorDe3(pm) : pm, r: w === "a" ? 1 : w === "b" ? 0 : 0.5 });
  }
  const evaluacion = evaluar(muestras);

  /* --- lo tuyo (v0.77) ------------------------------------------------
     Tus partidas con tu mazo y el del rival conocidos: lo que el modelo (con
     datos de fuera) esperaba y lo que pasó, por tu líder; y como fuente de
     emparejamientos propia. */
  let personal: DatosRecomendador["personal"] = null;
  if (meId) {
    const registros: RegistroPersonal[] = [];
    const cruces = new Map<string, Cruce>();
    for (const m of snap.matches) {
      if (!isPlayed(m)) continue;
      const lado = sideOf(m, meId);
      if (!lado) continue;
      const { a, b } = archetypesOfMatch(m, snap.archIndex, snap.archById);
      const mio = ldArch(lado === "a" ? a : b), suyo = ldArch(lado === "a" ? b : a);
      if (!mio || !suyo) continue;
      const w = outcome(m).winner;
      const r: 0 | 0.5 | 1 = w === "tie" ? 0.5 : w === lado ? 1 : 0;
      const p0 = pModelo(pPartida(fuera, mio, suyo).p);
      registros.push({ lider: mio, p: (m.bestOf ?? 1) >= 3 ? alMejorDe3(p0) : p0, r });
      if (mio !== suyo) {
        const x = cruces.get(`${mio}|${suyo}`) ?? { a: mio, b: suyo, w: 0, l: 0, t: 0 };
        if (r === 1) x.w++; else if (r === 0) x.l++; else x.t++;
        cruces.set(`${mio}|${suyo}`, x);
      }
    }
    const misLideres: string[] = [...new Set<string>(snap.decks
      .filter((d) => d.playerId === meId && !d.retired)
      .map((d) => ldArch(snap.archIndex.get(d.id)))
      .filter((l): l is string => Boolean(l)))];
    personal = { porLider: ajustesPersonales(registros), fuente: { id: "yo", cuota: {}, cruces: [...cruces.values()] }, misLideres };
  }

  const conv = [regionales, cityleagues].flatMap((f) => Object.values(f.conversion ?? {}));
  const tot = conv.reduce((s, c) => ({ n: s.n + c.n, corte: s.corte + c.corte }), { n: 0, corte: 0 });

  return {
    fuentes: { online, regionales, cityleagues }, trainerHill, grupo, consistencia, nombres, iconos,
    resumen: { online: resOnline, regionales: nReg, cityleagues: nCity, trainerHill: partidasTH, eventosDia2 },
    variantes: Object.fromEntries(Object.entries(variantes).map(([l, m]) => [l, [...m.values()]])),
    evaluacion,
    tasaCampo: tot.n ? tot.corte / tot.n : null,
    live,
    personal,
  };
}
