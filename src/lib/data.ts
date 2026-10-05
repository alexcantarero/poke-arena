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
  DeckOption, Game, MatchFull, MetaEntry, MetaEvent, PublicPlayer, Settings, TournamentFull,
  TournamentResult,
} from "./types";
import { deckArchetypeIndex, eloTable } from "./stats";
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
  ratingZone: "europe",
  registrationOpen: true,
  updatedAt: new Date(),
};

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
    cfgRows, playerRows, archRows, deckRows, compRows, compPlayerRows,
    matchRows, eventRows, tourRows, favRows, playerFavRows, gameRows, resultRows,
  ] = await Promise.all([
    db.select().from(settings).where(eq(settings.id, "default")),
    db.select(PUBLIC_PLAYER_COLUMNS).from(players).orderBy(asc(players.name)),
    db.select().from(archetypes).orderBy(asc(archetypes.name)),
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

  const config = cfgRows[0] ?? DEFAULT_SETTINGS;

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
  const elo = eloTable(matchesFull, playerRows, config,
    new Map(tourRows.map((t) => [t.id, { kind: t.kind, scope: t.scope }])));

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
    elo,
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

  const rank: Record<DeckOption["group"], number> = { fav: 0, mine: 1, shared: 2, other: 3 };
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
export function playerCp(snap: Snapshot, playerId: string, season?: number): CpTotals {
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
