import "server-only";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  archetypes, competitionPlayers, competitions, decks, events, games, invites, matches,
  players, settings, tournamentResults, tournaments,
} from "@/db/schema";
import type {
  Game, MatchFull, PublicPlayer, Settings, TournamentFull, TournamentResult,
} from "./types";
import { deckArchetypeIndex, eloTable } from "./stats";
import { computeCp, seasonOfDate, type CpResultInput, type CpTotals } from "./cp";
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
export async function loadSnapshot() {
  const [
    cfgRows, playerRows, archRows, deckRows, compRows, compPlayerRows,
    matchRows, eventRows, tourRows,
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
  ]);

  const matchIds = matchRows.map((m) => m.id);
  const tourIds = tourRows.map((t) => t.id);

  const [gameRows, resultRows] = await Promise.all([
    matchIds.length
      ? db.select().from(games).where(inArray(games.matchId, matchIds)).orderBy(asc(games.number))
      : Promise.resolve([] as Game[]),
    tourIds.length
      ? db.select().from(tournamentResults).where(inArray(tournamentResults.tournamentId, tourIds))
      : Promise.resolve([] as TournamentResult[]),
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

  const elo = eloTable(matchesFull, playerRows, config);

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
    elo,
    activePlayerIds: playerRows.filter((p) => p.active).map((p) => p.id),
  };
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
      return {
        id: r.id,
        kind: t.kind,
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
export async function currentPlayer(): Promise<PublicPlayer | null> {
  const session = await readSession();
  if (!session) return null;
  const rows = await db.select(PUBLIC_PLAYER_COLUMNS).from(players)
    .where(eq(players.id, session.playerId));
  const me = rows[0];
  return me?.active ? me : null;
}

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

/** Invitaciones vigentes. Solo se cargan cuando hacen falta (pantalla de ajustes). */
export async function loadInvites() {
  return db.select().from(invites).orderBy(desc(invites.createdAt));
}
