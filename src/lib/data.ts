import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  archetypes, competitionPlayers, competitions, decks, events, games, matches, players, settings,
} from "@/db/schema";
import type { Game, MatchFull } from "./types";
import { deckArchetypeIndex, eloTable } from "./stats";

export type Snapshot = Awaited<ReturnType<typeof loadSnapshot>>;

/**
 * Carga toda la liga de una vez.
 *
 * Con un grupo privado hablamos de decenas de jugadores y, como mucho, unos
 * miles de partidas: cabe de sobra en memoria y evita tener una consulta
 * distinta por pantalla. Si algún día crece de verdad, este es el sitio por
 * donde empezar a paginar.
 */
export async function loadSnapshot() {
  const [cfgRows, playerRows, archRows, deckRows, compRows, compPlayerRows, matchRows, eventRows] =
    await Promise.all([
      db.select().from(settings).where(eq(settings.id, "default")),
      db.select().from(players).orderBy(asc(players.name)),
      db.select().from(archetypes).orderBy(asc(archetypes.name)),
      db.select().from(decks).orderBy(asc(decks.created)),
      db.select().from(competitions).orderBy(asc(competitions.start)),
      db.select().from(competitionPlayers),
      db.select().from(matches).orderBy(asc(matches.date)),
      db.select().from(events).orderBy(asc(events.date)),
    ]);

  const matchIds = matchRows.map((m) => m.id);
  const gameRows: Game[] = matchIds.length
    ? await db.select().from(games).where(inArray(games.matchId, matchIds)).orderBy(asc(games.number))
    : [];

  const gamesByMatch = new Map<string, Game[]>();
  for (const g of gameRows) {
    const list = gamesByMatch.get(g.matchId);
    if (list) list.push(g);
    else gamesByMatch.set(g.matchId, [g]);
  }

  const full: MatchFull[] = matchRows.map((m) => ({ ...m, games: gamesByMatch.get(m.id) ?? [] }));

  const config = cfgRows[0] ?? {
    id: "default", name: "Liga Arena", season: "Temporada 1",
    ptsWin: 3, ptsTie: 1, ptsLoss: 0, eloStart: 1000, eloK: 24,
    inviteCode: "", updatedAt: new Date(),
  };

  const playersById = new Map(playerRows.map((p) => [p.id, p]));
  const archById = new Map(archRows.map((a) => [a.id, a]));
  const decksById = new Map(deckRows.map((d) => [d.id, d]));
  const compsById = new Map(compRows.map((c) => [c.id, c]));
  const archIndex = deckArchetypeIndex(deckRows, archRows);

  const playersOfComp = new Map<string, string[]>();
  for (const cp of compPlayerRows) {
    const list = playersOfComp.get(cp.competitionId);
    if (list) list.push(cp.playerId);
    else playersOfComp.set(cp.competitionId, [cp.playerId]);
  }

  const elo = eloTable(full, playerRows, config);

  return {
    config,
    players: playerRows,
    archetypes: archRows,
    decks: deckRows,
    competitions: compRows,
    matches: full,
    events: eventRows,
    playersById,
    archById,
    decksById,
    compsById,
    archIndex,
    playersOfComp,
    elo,
    activePlayerIds: playerRows.filter((p) => p.active).map((p) => p.id),
  };
}

export function compPlayers(snap: Snapshot, compId: string) {
  const ids = snap.playersOfComp.get(compId);
  return ids?.length ? ids : snap.activePlayerIds;
}
