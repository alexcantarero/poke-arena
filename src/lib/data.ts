import "server-only";
import { cache } from "react";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  archetypes, competitionPlayers, competitions, deckFavorites, decks, events, games, invites,
  competitionTeams, ladderEntries, leagueDecks, matches, seasonResets, metaEntries, metaEvents, playerFavorites, players, settings, tournamentResults,
  tournaments,
} from "@/db/schema";
import { ARCHETYPE_PREFIX } from "./types";
import { seriesElo } from "./ladderSeries";
import type {
  Archetype, DeckOption, Game, MatchFull, MetaEntry, MetaEvent, PublicPlayer, Settings, TournamentFull,
  TournamentResult,
} from "./types";
import { deckArchetypeIndex, eloTable, isPlayed, standings } from "./stats";
import { filasAPedir, planDeConsulta, TOPE_SIN_PAGINAR, type FiltroConsultable, type PlanDeConsulta } from "./matchQuery";
import { awardsCp, computeCp, cpKindOf, seasonOfDate, type CpResultInput, type CpTotals } from "./cp";
import { readSession } from "./auth";

export type Snapshot = Awaited<ReturnType<typeof loadSnapshot>>;

/**
 * Las columnas de `players` que pueden salir de servidor.
 *
 * Deliberadamente sin `email` ni `passwordHash`: el snapshot acaba como prop
 * de componentes cliente, y Next serializa esas props en el HTML. Si necesitas
 * el correo (login, panel de organizador), pídelo con un select explícito allí
 * donde haga falta, no lo metas aquí.
 */
export const PUBLIC_PLAYER_COLUMNS = {
  id: players.id,
  name: players.name,
  role: players.role,
  active: players.active,
  color: players.color,
  avatarKind: players.avatarKind,
  avatarValue: players.avatarValue,
  bio: players.bio,
  favoriteArchetypeId: players.favoriteArchetypeId,
  playerTag: players.playerTag,
  // v0.36: el nick de Limitless. Cada uno lo pone en su perfil y es su
  // nombre en una web pública, así que no hay nada que esconder.
  limitlessHandle: players.limitlessHandle,
  // El rango del ladder sí es público: el sentido es que se vea.
  ladderElo: players.ladderElo,
  ladderEloUpdatedAt: players.ladderEloUpdatedAt,
  ladderNote: players.ladderNote,
  // v0.17: el puesto en la clasificación oficial también es para verse.
  rankSpain: players.rankSpain,
  rankEurope: players.rankEurope,
  rankZoneUpdatedAt: players.rankZoneUpdatedAt,
  joined: players.joined,
  lastSeenAt: players.lastSeenAt,
  createdAt: players.createdAt,
  // El `satisfies` es el candado: exige exactamente las claves de PublicPlayer,
  // ni una menos ni una más. Si alguien vuelve a añadir `email` aquí, deja de
  // compilar en vez de empezar a mandar correos al navegador en silencio.
} satisfies Record<keyof PublicPlayer, unknown>;

const DEFAULT_SETTINGS: Settings = {
  id: "default",
  name: "Liga Arena",
  season: "Temporada 1",
  cpSeason: 2027,
  ptsWin: 3, ptsTie: 1, ptsLoss: 0,
  eloStart: 1000, eloK: 24,
  eloScope: "competitive",
  eloSince: null,
  ladderSince: null,
  featuredRegionalId: null,
  ratingZone: "europe",
  registrationOpen: true,
  updatedAt: new Date(),
};

/**
 * La fila de ajustes, sola.
 *
 * v0.28. Existe para que el layout de `(app)` —que solo necesita el nombre de
 * la liga y la temporada— no tenga que cargar el snapshot entero. Va envuelta
 * en `cache()`, así que una pantalla que además pida el snapshot no hace dos
 * veces esta consulta: `loadSnapshot()` la reutiliza.
 */
export const loadConfig = cache(async (): Promise<Settings> => {
  const rows = await db.select().from(settings).where(eq(settings.id, "default"));
  return rows[0] ?? DEFAULT_SETTINGS;
});

/**
 * Solo los jugadores, por nombre. Misma proyección pública que el snapshot:
 * ni `email` ni `passwordHash` salen de aquí.
 */
export const loadPlayers = cache(async (): Promise<PublicPlayer[]> =>
  db.select(PUBLIC_PLAYER_COLUMNS).from(players).orderBy(asc(players.name)));

/** Solo los arquetipos, por nombre. */
export const loadArchetypes = cache(async () =>
  db.select().from(archetypes).orderBy(asc(archetypes.name)));

/**
 * Carga toda la liga de una vez.
 *
 * Con un grupo privado son decenas de jugadores y, como mucho, unos miles de
 * partidas: cabe de sobra en memoria y evita tener una consulta distinta por
 * pantalla. Si algún día crece, este es el sitio por donde empezar a paginar.
 */
/**
 * v0.20 — RENDIMIENTO. Dos cambios que no se ven y se notan:
 *
 *  1. `cache()` de React: dentro de UNA petición, la primera llamada hace
 *     el trabajo y las demás reciben el mismo resultado. Antes el layout y la
 *     página llamaban a `loadSnapshot()` cada uno por su lado: dos cargas
 *     completas de la base por cada pantalla. No cachea ENTRE peticiones, así
 *     que nunca se ven datos viejos.
 *  2. Un solo viaje a la base en vez de tres en cadena. Las partidas y los
 *     torneos se cargan enteros, así que sus juegos y resultados también se
 *     pueden pedir enteros, a la vez, sin esperar a saber los ids (y sin un
 *     `IN (…)` con cientos de ids, que además era más lento).
 */
export const loadSnapshot = cache(async () => {
  const [
    config, playerRows, archRows, deckRows, compRows, compPlayerRows,
    matchRows, eventRows, tourRows, favRows, playerFavRows, gameRows, resultRows,
  ] = await Promise.all([
    // v0.28: la misma función que usa el layout. `cache()` la deduplica, así
    // que pedir las dos cosas en una pantalla sigue siendo una sola consulta.
    loadConfig(),
    loadPlayers(),
    loadArchetypes(),
    db.select().from(decks).orderBy(asc(decks.created)),
    db.select().from(competitions).orderBy(asc(competitions.start)),
    db.select().from(competitionPlayers),
    db.select().from(matches).orderBy(asc(matches.date)),
    db.select().from(events).orderBy(asc(events.date)),
    db.select().from(tournaments).orderBy(desc(tournaments.date)),
    db.select().from(deckFavorites),
    db.select().from(playerFavorites),
    // Todos los juegos y resultados: cuelgan de partidas y torneos con
    // ON DELETE CASCADE, así que no hay huérfanos que filtrar.
    db.select().from(games).orderBy(asc(games.number)) as Promise<Game[]>,
    db.select().from(tournamentResults) as Promise<TournamentResult[]>,
  ]);

  const gamesByMatch = new Map<string, Game[]>();
  for (const g of gameRows) {
    const list = gamesByMatch.get(g.matchId);
    if (list) list.push(g);
    else gamesByMatch.set(g.matchId, [g]);
  }

  const resultsByTour = new Map<string, TournamentResult[]>();
  for (const r of resultRows) {
    const list = resultsByTour.get(r.tournamentId);
    if (list) list.push(r);
    else resultsByTour.set(r.tournamentId, [r]);
  }

  const matchesFull: MatchFull[] = matchRows.map((m) => ({ ...m, games: gamesByMatch.get(m.id) ?? [] }));
  const toursFull: TournamentFull[] = tourRows.map((t) => ({ ...t, results: resultsByTour.get(t.id) ?? [] }));

  const playersById = new Map(playerRows.map((p) => [p.id, p]));
  const archById = new Map(archRows.map((a) => [a.id, a]));
  const decksById = new Map(deckRows.map((d) => [d.id, d]));
  const compsById = new Map(compRows.map((c) => [c.id, c]));
  const toursById = new Map(toursFull.map((t) => [t.id, t]));
  const archIndex = deckArchetypeIndex(deckRows, archRows);

  const playersOfComp = new Map<string, string[]>();
  for (const cp of compPlayerRows) {
    const list = playersOfComp.get(cp.competitionId);
    if (list) list.push(cp.playerId);
    else playersOfComp.set(cp.competitionId, [cp.playerId]);
  }

  const resultsByPlayer = new Map<string, TournamentResult[]>();
  for (const r of resultRows) {
    const list = resultsByPlayer.get(r.playerId);
    if (list) list.push(r);
    else resultsByPlayer.set(r.playerId, [r]);
  }

  // Favoritos por jugador, para que los selectores enseñen primero lo de cada uno.
  const favoriteDecks = new Map<string, Set<string>>();
  for (const f of favRows) {
    const set = favoriteDecks.get(f.playerId);
    if (set) set.add(f.deckId);
    else favoriteDecks.set(f.playerId, new Set([f.deckId]));
  }

  // v0.17: a quién sigue cada uno.
  const favoritePlayers = new Map<string, Set<string>>();
  for (const f of playerFavRows) {
    const set = favoritePlayers.get(f.playerId);
    if (set) set.add(f.favoriteId);
    else favoritePlayers.set(f.playerId, new Set([f.favoriteId]));
  }

  // v0.21: el tipo de cada torneo da el peso de sus rondas en el Elo.
  //
  // v0.28: PEREZOSO. `eloTable()` recorre TODAS las partidas en orden
  // cronológico, y era con diferencia el trabajo de CPU más caro del snapshot.
  // Solo 6 de las 23 pantallas que llaman a `loadSnapshot()` leen `.elo`
  // (inicio, ranking, perfil, liga, ficha de liga y ficha de partida); las
  // otras 17 lo pagaban sin usarlo. El getter lo calcula la primera vez que
  // alguien lo pide y lo memoriza para el resto de la petición, así que desde
  // fuera `snap.elo` se sigue leyendo igual y ninguna pantalla cambia.
  //
  // Cuidado: no hagas `{ ...snap }` ni serialices el snapshot entero, porque
  // eso dispara el getter y pierdes el ahorro.
  const tourWeights = new Map(tourRows.map((t) => [t.id, { kind: t.kind, scope: t.scope }]));
  let eloCache: ReturnType<typeof eloTable> | null = null;

  return {
    config,
    players: playerRows,
    archetypes: archRows,
    decks: deckRows,
    competitions: compRows,
    matches: matchesFull,
    tournaments: toursFull,
    events: eventRows,
    playersById,
    archById,
    decksById,
    compsById,
    toursById,
    archIndex,
    playersOfComp,
    resultsByPlayer,
    favoriteDecks,
    favoritePlayers,
    get elo() {
      eloCache ??= eloTable(matchesFull, playerRows, config, tourWeights);
      return eloCache;
    },
    activePlayerIds: playerRows.filter((p) => p.active).map((p) => p.id),
  };
});

/**
 * Los mazos que se le pueden ofrecer a alguien, en el orden en que los quiere.
 *
 * Favoritos primero, después los suyos, después los de la biblioteca de la
 * liga y al final los de otra gente. El orden importa más de lo que parece:
 * en el móvil, entre rondas, la diferencia entre acertar a la primera y tener
 * que buscar es la diferencia entre apuntar la ronda y no apuntarla.
 *
 * `includeOthers` en false deja fuera los mazos de otras personas, que es lo
 * que quieres al decir «con qué jugué yo» y lo que NO quieres al decir «qué
 * llevaba mi rival».
 */
export function deckOptions(
  snap: Snapshot,
  playerId: string | null | undefined,
  { includeOthers = true, includeRetired = false } = {},
): DeckOption[] {
  const favs = playerId ? snap.favoriteDecks.get(playerId) ?? new Set<string>() : new Set<string>();

  const rows = snap.decks
    .filter((d) => includeRetired || !d.retired)
    .map((d): DeckOption | null => {
      const mine = playerId != null && d.playerId === playerId;
      const shared = d.playerId == null;
      if (!mine && !shared && !includeOthers) return null;

      const group: DeckOption["group"] =
        favs.has(d.id) ? "fav" : mine ? "mine" : shared ? "shared" : "other";

      const arch = snap.archById.get(d.archetypeId);
      return {
        id: d.id,
        name: d.name,
        archetypeId: d.archetypeId,
        archetypeName: arch?.name ?? "",
        main: arch?.main ?? "",
        secondary: arch?.secondary ?? "",
        type: arch?.type ?? "colorless",
        group,
        ownerName: group === "other"
          ? snap.playersById.get(d.playerId as string)?.name ?? undefined
          : undefined,
        hasList: Boolean(d.list && d.list.trim()),
      };
    })
    .filter((x): x is DeckOption => x !== null);

  const rank: Record<DeckOption["group"], number> = { fav: 0, mine: 1, shared: 2, other: 3, arch: 4 };
  return rows.sort((a, b) => rank[a.group] - rank[b.group] || a.name.localeCompare(b.name, "es"));
}

/**
 * Los arquetipos como opciones de mazo, para cuando no hay lista que elegir.
 *
 * Un arquetipo no es un mazo, pero en un selector se comporta igual y ahorra
 * tener dos desplegables donde basta uno. Se distinguen por el `id`, que lleva
 * el prefijo `arch:`.
 */
export function archetypeOptions(snap: Snapshot): DeckOption[] {
  return snap.archetypes.map((a) => ({
    id: `${ARCHETYPE_PREFIX}${a.id}`,
    name: a.name,
    archetypeId: a.id,
    archetypeName: a.name,
    main: a.main,
    secondary: a.secondary,
    type: a.type,
    group: "shared" as const,
    hasList: false,
  }));
}

export function compPlayers(snap: Snapshot, compId: string) {
  const ids = snap.playersOfComp.get(compId);
  return ids?.length ? ids : snap.activePlayerIds;
}

/** Championship Points de un jugador en la temporada indicada. */
/** Lo único que necesita `playerCp`. v0.47: antes pedía el snapshot entero,
    y eso obligaba a cargar las 13 tablas en cualquier pantalla con CP. */
export type DatosCp = Pick<Snapshot, "config" | "resultsByPlayer" | "toursById">;

export function playerCp(snap: DatosCp, playerId: string, season?: number): CpTotals {
  const target = season ?? snap.config.cpSeason;
  const rows: CpResultInput[] = (snap.resultsByPlayer.get(playerId) ?? [])
    .map((r) => {
      const t = snap.toursById.get(r.tournamentId);
      if (!t) return null;
      // Si al torneo se le olvidó la temporada, la deducimos de la fecha. Lo
      // que no hacemos es darlo por bueno para cualquier temporada: eso hacía
      // que el mismo resultado sumara en 2026 y en 2027 a la vez.
      if ((t.season ?? seasonOfDate(t.date)) !== target) return null;
      // v0.15: lo online no reparte CP, aunque se apuntara como Challenge.
      const kind = cpKindOf(t);
      if (!awardsCp(target, kind)) return null;
      return {
        id: r.id,
        kind,
        date: t.date,
        placement: r.placement,
        playerCount: t.playerCount,
        cpEarned: r.cpEarned,
        cpManual: r.cpManual,
        tournamentName: t.name,
      } satisfies CpResultInput;
    })
    .filter((x): x is CpResultInput => x !== null);
  return computeCp(target, rows);
}

/**
 * ¿Hay alguien dentro ahora mismo?
 *
 * Comprueba la cookie **y** que el jugador siga existiendo y activo. Es lo que
 * usan las pantallas de acceso para no rebotar en bucle: la cookie de alguien
 * a quien acaban de desactivar sigue estando bien firmada, así que sin esta
 * comprobación `/` mandaba a `/entrar` y `/entrar` devolvía a `/` sin parar.
 *
 * No borra la cookie: durante el pintado de una página no se pueden escribir
 * cookies en Next 15. La cookie caduca sola, y si esa persona vuelve a entrar
 * se sobrescribe; mientras tanto es inofensiva, porque aquí se comprueba
 * `active` contra la base de datos en cada petición.
 */
/** v0.20: también con `cache()` — layout y página lo pedían por separado. */
export const currentPlayer = cache(async (): Promise<PublicPlayer | null> => {
  const session = await readSession();
  if (!session) return null;
  const rows = await db.select(PUBLIC_PLAYER_COLUMNS).from(players)
    .where(eq(players.id, session.playerId));
  const me = rows[0];
  return me?.active ? me : null;
});

/**
 * Los correos de todos, por id.
 *
 * Aparte del snapshot y a propósito: esto solo lo pide la pantalla de ajustes,
 * que ya es de organizadores. Así el correo no viaja en todas las páginas.
 */
export async function loadPlayerEmails(): Promise<Record<string, string>> {
  const rows = await db.select({ id: players.id, email: players.email }).from(players);
  return Object.fromEntries(rows.filter((r) => r.email).map((r) => [r.id, r.email as string]));
}

/* --------------------------------------------- metagame presencial --- */

/**
 * Lo importado de los Regionales, aparte del snapshot.
 *
 * Aparte a propósito, por lo mismo que los correos: esto solo lo miran Top
 * Decks y la pantalla de importación, y una clasificación de top 64 por
 * evento crece más deprisa que el resto de la liga. Meterlo en `loadSnapshot`
 * sería pagarlo en todas las páginas para usarlo en dos.
 */
export async function loadMetaIrl(): Promise<{ events: MetaEvent[]; entries: MetaEntry[] }> {
  const evs = await db.select().from(metaEvents).orderBy(desc(metaEvents.date));
  if (!evs.length) return { events: [], entries: [] };
  const rows = await db.select().from(metaEntries)
    .where(inArray(metaEntries.eventId, evs.map((e) => e.id)))
    .orderBy(asc(metaEntries.placement));
  return { events: evs, entries: rows };
}

/** Solo las cabeceras, para la lista de «lo que ya está importado». */
export async function loadMetaEvents(): Promise<Array<MetaEvent & { entries: number }>> {
  const evs = await db.select().from(metaEvents).orderBy(desc(metaEvents.date));
  if (!evs.length) return [];
  const counts = await db
    .select({ eventId: metaEntries.eventId, n: sql<number>`sum(${metaEntries.copies})::int` })
    .from(metaEntries)
    .groupBy(metaEntries.eventId);
  const byId = new Map(counts.map((c) => [c.eventId, c.n]));
  return evs.map((e) => ({ ...e, entries: byId.get(e.id) ?? 0 }));
}

/** Invitaciones vigentes. Solo se cargan cuando hacen falta (pantalla de ajustes). */
export async function loadInvites() {
  return db.select().from(invites).orderBy(desc(invites.createdAt));
}

/* ================================================================ v0.18 -- */

export type LeagueDeckRow = {
  playerId: string;
  slot: number;
  deckId: string | null;
  archetypeId: string | null;
  lockedAt: Date;
};

/**
 * Mazos de liga bloqueados de una competición, YA FILTRADOS por permisos:
 * un organizador recibe todos; cualquier otro, solo el suyo. El filtro va
 * aquí, en el servidor, y no en la pantalla: lo que se devuelve es lo único
 * que puede acabar en el HTML.
 */
export async function leagueDecksOf(
  competitionId: string,
  viewer: { id: string; manager: boolean } | null,
): Promise<LeagueDeckRow[]> {
  if (!viewer) return [];
  const where = viewer.manager
    ? eq(leagueDecks.competitionId, competitionId)
    : and(eq(leagueDecks.competitionId, competitionId), eq(leagueDecks.playerId, viewer.id));
  return db.select({
    playerId: leagueDecks.playerId,
    slot: leagueDecks.slot,
    deckId: leagueDecks.deckId,
    archetypeId: leagueDecks.archetypeId,
    lockedAt: leagueDecks.lockedAt,
  }).from(leagueDecks).where(where);
}

/** Quién ha entregado ya su mazo (sin decir cuál): eso sí lo puede ver todo el mundo. */
export async function leagueDeckSubmitters(competitionId: string): Promise<Set<string>> {
  const rows = await db.select({ playerId: leagueDecks.playerId }).from(leagueDecks)
    .where(eq(leagueDecks.competitionId, competitionId));
  return new Set(rows.map((r) => r.playerId));
}

/** Historial del ladder de una persona desde una fecha (el último reset), en orden. */
export async function ladderHistory(playerId: string, since: Date | null) {
  const where = since
    ? and(eq(ladderEntries.playerId, playerId), gte(ladderEntries.createdAt, since))
    : eq(ladderEntries.playerId, playerId);
  return db.select({ elo: ladderEntries.elo, at: ladderEntries.createdAt })
    .from(ladderEntries).where(where).orderBy(asc(ladderEntries.createdAt));
}

/* ================================================================ v0.19 -- */

/**
 * Todo lo que necesita la gráfica del ladder: cada cambio de rango de cada
 * uno y las fechas de los resets de temporada. Va aparte del snapshot (solo
 * lo usa el Ranking) y solo lleva id, número y fecha.
 */
export async function ladderChartData() {
  const [entries, resets] = await Promise.all([
    db.select({ playerId: ladderEntries.playerId, elo: ladderEntries.elo, at: ladderEntries.createdAt })
      .from(ladderEntries).orderBy(asc(ladderEntries.createdAt)),
    db.select({ at: seasonResets.at }).from(seasonResets).orderBy(asc(seasonResets.at)),
  ]);
  return { entries, resets: resets.map((r) => r.at) };
}

/* ================================================================ v0.22 -- */

/**
 * La gráfica de evolución del Elo de la liga, para todos a la vez: una serie
 * por jugador activo con historial, y la fecha de corte (`elo_since`) como
 * línea de reset. Misma forma que la del ladder (`SerieLadder`).
 */
export function eloChartData(snap: Snapshot) {
  const { series: por, fechas } = seriesElo(snap.elo.history);
  const series = snap.players
    .filter((p) => p.active && por.has(p.id))
    .map((p, i) => ({
      id: p.id,
      name: p.name,
      color: p.color || `var(--series-${(i % 7) + 1})`,
      actual: snap.elo.rating[p.id] ?? null,
      puntos: por.get(p.id)!,
    }));
  // Con el eje en nº de partida, el corte del Elo ya está fuera (las partidas
  // anteriores no cuentan): no hay línea de reset que pintar.
  return { series, resets: [] as number[], fechas };
}

/* ================================================================ v0.23 -- */

/** Equipos de una liga por equipos, por nombre. */
export async function teamsOf(competitionId: string) {
  return db.select().from(competitionTeams)
    .where(eq(competitionTeams.competitionId, competitionId))
    .orderBy(asc(competitionTeams.name));
}

/* ================================================================ v0.25 -- */

/** La liga «principal»: la de liga en curso, si no cualquiera en curso, si no la primera. */
export function mainCompetition(snap: Snapshot) {
  return snap.competitions.find((c) => c.status === "live" && c.kind === "league")
    ?? snap.competitions.find((c) => c.status === "live")
    ?? snap.competitions[0];
}

/**
 * v0.25 — Dónde está alguien: puesto en la clasificación de la liga principal
 * y puesto en el ranking global de Elo (entre los jugadores activos). `null`
 * si no aparece (no juega esa liga, o no está activo).
 */
export function posicionesDe(snap: Snapshot, playerId: string) {
  const comp = mainCompetition(snap);
  const played = snap.matches.filter(isPlayed);
  const scoped = comp ? played.filter((m) => m.competitionId === comp.id) : played;
  const tabla = standings(scoped, comp ? compPlayers(snap, comp.id) : snap.activePlayerIds, snap.elo.rating, snap.config);
  const iLiga = tabla.findIndex((r) => r.playerId === playerId);
  const porElo = [...snap.activePlayerIds].sort((a, b) => (snap.elo.rating[b] ?? 0) - (snap.elo.rating[a] ?? 0));
  const iElo = porElo.indexOf(playerId);
  return {
    comp,
    liga: iLiga >= 0 ? { pos: iLiga + 1, total: tabla.length } : null,
    elo: iElo >= 0 ? { pos: iElo + 1, total: porElo.length } : null,
    partidasTotales: played.length,
  };
}

/* =========================================================================
   v0.29 · Fase A del plan de rendimiento: Resultados paginado en la base.

   Antes, abrir Resultados cargaba el snapshot entero —todas las partidas y
   todos los juegos— para enseñar cuarenta tarjetas. El coste de la pantalla
   crecía con el historial, que es justo lo que hay que romper (ver
   `docs/13-plan-rendimiento.md`).

   Qué baja a SQL y qué no lo decide `src/lib/matchQuery.ts`, que es puro y
   tiene sus pruebas. Aquí solo se traduce ese plan a Drizzle.

   La regla que no hay que romper: el filtro de arquetipo se sigue aplicando
   con `applyMatchFilter`, el mismo que usa Estadísticas. Dos definiciones de
   «con qué se jugó» es exactamente el problema que `filters.ts` vino a
   resolver.
   ========================================================================= */

/** Una partida con sus juegos, tal y como la espera la pantalla. */
export type PaginaDePartidas = {
  filas: MatchFull[];
  /** Total que cumple el filtro. */
  total: number;
  /** `true` si `total` está recortado por el tope de seguridad. */
  totalRecortado: boolean;
  hayMas: boolean;
};

function condicionesDe(plan: PlanDeConsulta) {
  const s = plan.sql;
  const w = [];

  /* «Jugada» es la misma definición que `isPlayed`: resultado declarado o
     al menos un juego apuntado. El EXISTS no trae los juegos, solo mira. */
  w.push(sql`(${matches.status} = 'done' AND (${matches.seriesResult} IS NOT NULL
    OR EXISTS (SELECT 1 FROM ${games} g WHERE g.match_id = ${matches.id})))`);

  if (s.ambito === "league") w.push(sql`${matches.competitionId} IS NOT NULL`);
  if (s.ambito === "tournament") w.push(sql`${matches.tournamentId} IS NOT NULL`);
  if (s.ambito === "casual") {
    w.push(sql`${matches.competitionId} IS NULL AND ${matches.tournamentId} IS NULL`);
  }
  if (s.ambito === "onsite" || s.ambito === "online") {
    // Un torneo sin `scope` guardado es presencial: mismo criterio que
    // `applyMatchFilter`, donde el valor por defecto es `onsite`.
    w.push(sql`${matches.tournamentId} IS NOT NULL`);
    w.push(s.ambito === "onsite"
      ? sql`COALESCE(${tournaments.scope}, 'onsite') = 'onsite'`
      : sql`COALESCE(${tournaments.scope}, 'onsite') = 'online'`);
  }

  if (s.desde) w.push(gte(matches.date, s.desde));
  if (s.hasta) w.push(sql`${matches.date} <= ${s.hasta}`);
  if (s.torneoId) w.push(eq(matches.tournamentId, s.torneoId));
  if (s.competicionId) w.push(eq(matches.competitionId, s.competicionId));
  if (s.ronda) w.push(eq(matches.round, s.ronda));

  // v0.15.1: también cuenta haber sido el rival de una ronda de torneo.
  if (s.jugadorId) {
    w.push(sql`(${matches.playerAId} = ${s.jugadorId}
      OR ${matches.playerBId} = ${s.jugadorId}
      OR ${matches.opponentPlayerId} = ${s.jugadorId})`);
  }

  if (s.tipoTorneo) {
    w.push(sql`${matches.tournamentId} IS NOT NULL`);
    w.push(eq(tournaments.kind, s.tipoTorneo));
  }
  if (s.formato) {
    w.push(sql`${matches.tournamentId} IS NOT NULL`);
    w.push(eq(tournaments.format, s.formato));
  }
  if (s.tipoCompeticion) {
    w.push(sql`${matches.competitionId} IS NOT NULL`);
    w.push(eq(competitions.kind, s.tipoCompeticion));
  }

  return and(...w);
}

/**
 * Las partidas de una página de Resultados.
 *
 * El orden es el mismo que `porRecientes`: fecha, ronda, alta, id, todo
 * descendente. Tiene que coincidir, porque si la base ordenara distinto que
 * la memoria, pasar de página se saltaría filas o repetiría otras.
 */
export const loadMatchesPage = cache(async (
  filtro: FiltroConsultable,
  porPagina: number,
  pagina: number,
): Promise<PaginaDePartidas> => {
  const plan = planDeConsulta(filtro);
  const { limit, offset, recortaDespues } = filasAPedir(plan, porPagina, pagina);
  const where = condicionesDe(plan);

  const base = db.select({ m: matches }).from(matches);
  const conJoins = plan.sql.uneTorneos
    ? (plan.sql.uneCompeticiones
      ? base.leftJoin(tournaments, eq(matches.tournamentId, tournaments.id))
        .leftJoin(competitions, eq(matches.competitionId, competitions.id))
      : base.leftJoin(tournaments, eq(matches.tournamentId, tournaments.id)))
    : (plan.sql.uneCompeticiones
      ? base.leftJoin(competitions, eq(matches.competitionId, competitions.id))
      : base);

  const filas = await conJoins
    .where(where)
    .orderBy(desc(matches.date), desc(matches.round), desc(matches.createdAt), desc(matches.id))
    .limit(limit)
    .offset(offset);

  const ids = filas.map((r) => r.m.id);
  const juegos = ids.length
    ? await db.select().from(games).where(inArray(games.matchId, ids)).orderBy(asc(games.number))
    : [];

  const porPartida = new Map<string, Game[]>();
  for (const g of juegos as Game[]) {
    const lista = porPartida.get(g.matchId);
    if (lista) lista.push(g);
    else porPartida.set(g.matchId, [g]);
  }

  const completas: MatchFull[] = filas.map((r) => ({ ...r.m, games: porPartida.get(r.m.id) ?? [] }));

  if (plan.paginable) {
    // Se pidió una fila de más justo para esto, sin un COUNT aparte.
    const hayMas = completas.length > porPagina;
    return {
      filas: hayMas ? completas.slice(0, porPagina) : completas,
      total: offset + Math.min(completas.length, porPagina) + (hayMas ? 1 : 0),
      totalRecortado: hayMas,
      hayMas,
    };
  }

  // Sin paginar en la base: quien llama termina de filtrar y de cortar.
  return {
    filas: completas,
    total: completas.length,
    totalRecortado: recortaDespues && completas.length >= TOPE_SIN_PAGINAR,
    hayMas: false,
  };
});

/** Cuántas partidas jugadas hay en total, sin traerlas. Para la cabecera. */
export const contarPartidasJugadas = cache(async (): Promise<number> => {
  const filas = await db.select({ n: sql<number>`count(*)::int` }).from(matches)
    .where(sql`(${matches.status} = 'done' AND (${matches.seriesResult} IS NOT NULL
      OR EXISTS (SELECT 1 FROM ${games} g WHERE g.match_id = ${matches.id})))`);
  return filas[0]?.n ?? 0;
});

/**
 * El índice mazo → arquetipo, sin traerse las listas de 60 cartas.
 *
 * `deckArchetypeIndex()` solo mira `id` y `archetypeId`, pero la tabla
 * `decks` lleva además `list` y `list_json` con la lista entera. Pedir dos
 * columnas en vez de la fila completa es la diferencia entre unos kilobytes
 * y unos cuantos megas en cuanto haya mazos de verdad.
 */
export const loadDeckArchetypeIndex = cache(async (): Promise<Map<string, Archetype | undefined>> => {
  const [filas, archs] = await Promise.all([
    db.select({ id: decks.id, archetypeId: decks.archetypeId }).from(decks),
    loadArchetypes(),
  ]);
  const porId = new Map(archs.map((a) => [a.id, a]));
  return new Map(filas.map((d) => [d.id, porId.get(d.archetypeId)]));
});

/** Los torneos, sin sus resultados. Para selectores y para poner el nombre. */
export const loadTournamentHeads = cache(async () =>
  db.select().from(tournaments).orderBy(desc(tournaments.date)));

/** Las competiciones. Para selectores y para poner el nombre. */
export const loadCompetitionHeads = cache(async () =>
  db.select().from(competitions).orderBy(asc(competitions.start)));

/* =========================================================================
   v0.39 · Fase B del plan de rendimiento: consultas por pantalla.

   La Fase A quitó el snapshot de Resultados. Esto hace lo mismo con las
   pantallas que ya no necesitaban casi nada de él.

   Qué cambia de verdad: `loadSnapshot()` lee las tablas `matches` y `games`
   enteras, y son las dos únicas que crecen sin parar. Una pantalla que no
   las necesita y las carga igual tiene un coste que sube con el historial
   aunque la pantalla no cambie nunca. Eso es lo que se corta aquí.
   ========================================================================= */

/** Las jornadas y fechas señaladas de la liga. Tabla pequeña y estable. */
export const loadEvents = cache(async () =>
  db.select().from(events).orderBy(asc(events.date)));

/**
 * Solo las partidas que son rondas de un torneo.
 *
 * `/torneos` necesita las rondas para saber con qué mazo fue cada uno y
 * cuántas lleva apuntadas, pero no le hacen ninguna falta las jornadas de
 * liga ni los amistosos, que en una liga activa son la mayoría. Los juegos
 * tampoco: esa pantalla no baja al detalle de cada juego.
 */
export const loadTournamentMatches = cache(async (): Promise<MatchFull[]> => {
  const filas = await db.select().from(matches)
    .where(sql`${matches.tournamentId} IS NOT NULL`)
    .orderBy(asc(matches.date), asc(matches.round));
  /* v0.47 — con sus juegos: una ronda apuntada juego a juego no tiene el
     resultado de la serie escrito, y sin los juegos su récord saldría vacío.
     Solo los de estas partidas, no la tabla entera. */
  const ids = filas.map((m) => m.id);
  const juegos = ids.length
    ? await db.select().from(games).where(inArray(games.matchId, ids)).orderBy(asc(games.number))
    : [];
  const porPartida = new Map<string, Game[]>();
  for (const g of juegos as Game[]) {
    const l = porPartida.get(g.matchId);
    if (l) l.push(g); else porPartida.set(g.matchId, [g]);
  }
  return filas.map((m) => ({ ...m, games: porPartida.get(m.id) ?? [] }));
});

/**
 * v0.47 — Fase B: lo que necesita `/torneos`, sin el snapshot.
 *
 * La pantalla solo usa torneos con sus resultados, jugadores, el índice de
 * mazos y las RONDAS de torneo. El snapshot le traía además todas las
 * jornadas de liga, los amistosos y sus juegos —en una liga activa, la
 * mayoría de las partidas— para no enseñar ninguna.
 *
 * Devuelve las mismas formas que el snapshot (`TournamentFull`, los mismos
 * mapas), para que la pantalla no cambie su lógica y `playerCp` dé
 * exactamente las mismas cifras.
 */
export const loadTorneosPantalla = cache(async () => {
  const [config, players, tourRows, resultRows, archIndex, roundMatches] = await Promise.all([
    loadConfig(), loadPlayers(), loadTournamentHeads(),
    db.select().from(tournamentResults) as Promise<TournamentResult[]>,
    loadDeckArchetypeIndex(), loadTournamentMatches(),
  ]);
  const resultsByTour = new Map<string, TournamentResult[]>();
  const resultsByPlayer = new Map<string, TournamentResult[]>();
  for (const r of resultRows) {
    const t = resultsByTour.get(r.tournamentId); if (t) t.push(r); else resultsByTour.set(r.tournamentId, [r]);
    const q = resultsByPlayer.get(r.playerId); if (q) q.push(r); else resultsByPlayer.set(r.playerId, [r]);
  }
  const tournaments: TournamentFull[] = tourRows.map((t) => ({ ...t, results: resultsByTour.get(t.id) ?? [] }));
  return {
    config, players, tournaments, archIndex, matches: roundMatches, resultsByPlayer,
    playersById: new Map(players.map((p) => [p.id, p])),
    toursById: new Map(tournaments.map((t) => [t.id, t])),
  };
});

/**
 * v0.54 — mis partidas pendientes de resultado (jornadas de liga creadas y sin
 * jugar). Es la única «notificación» de la app: un número en el menú y la lista
 * arriba de Inicio. Consulta pequeña e indexable; nada del snapshot.
 */
export const cargarPendientesDe = cache(async (playerId: string) => {
  return db.select({
    id: matches.id, round: matches.round, bestOf: matches.bestOf, competitionId: matches.competitionId,
    playerAId: matches.playerAId, playerBId: matches.playerBId, opponentName: matches.opponentName,
  }).from(matches)
    .where(sql`${matches.status} = 'pending' AND (${matches.playerAId} = ${playerId} OR ${matches.playerBId} = ${playerId})`)
    .orderBy(asc(matches.round))
    .limit(20);
});

/** v0.60 — ¿le toca el tutorial de primera vez? Consulta aparte y mínima: el dato no viaja con el resto del jugador. */
export const tutorialPendiente = cache(async (playerId: string): Promise<boolean> => {
  const r = await db.select({ visto: players.tutorialVistoAt }).from(players).where(eq(players.id, playerId));
  return r.length > 0 && r[0].visto == null;
});
