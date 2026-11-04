import "server-only";
import { and, eq, inArray, isNotNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { archetypes, decks, games, matches, tournamentResults, tournaments } from "@/db/schema";
import type { PublicPlayer, Settings } from "@/lib/types";
import { archetypeStats, deckArchetypeIndex, isPlayed, longestWinStreak, playerRecord } from "@/lib/stats";
import { badgesOf } from "@/lib/badges";
import {
  computeCp, cpKindOf, seasonOfDate, type CpResultInput,
} from "@/lib/cp";
import { convStats, type PlacementRow } from "@/lib/tournamentStats";
import { leerLogros, tituloDePerfil, type AvanceTitulos, type TituloPerfil } from "@/lib/logros";

type DatosTitulo = Pick<PublicPlayer, "id" | "profileTitle" | "logros">;

const avanceVacio = (): AvanceTitulos => ({
  liga: 0, torneos: 0, cortes: 0, medallas: 0, medallasOro: 0, logros: 0,
});

export async function tituloParaBarra(jugador: DatosTitulo, cfg: Settings): Promise<TituloPerfil | null> {
  const { profileTitle, logros } = jugador;
  if (!profileTitle) return null;

  const avance = avanceVacio();
  avance.logros = leerLogros(logros).length;

  if (profileTitle === "liga") {
    const [fila] = await db.select({ n: sql<number>`count(*)::int` }).from(matches).where(and(
      eq(matches.status, "done"),
      isNotNull(matches.competitionId),
      or(eq(matches.playerAId, jugador.id), eq(matches.playerBId, jugador.id)),
      sql`(${matches.seriesResult} IS NOT NULL OR EXISTS (
        SELECT 1 FROM ${games} WHERE ${games.matchId} = ${matches.id}
      ))`,
    ));
    avance.liga = fila?.n ?? 0;
  } else if (profileTitle === "circuito") {
    const [fila] = await db.select({ n: sql<number>`count(*)::int` }).from(tournamentResults)
      .where(eq(tournamentResults.playerId, jugador.id));
    avance.torneos = fila?.n ?? 0;
  } else if (profileTitle === "eventos") {
    const [fila] = await db.select({ n: sql<number>`count(*)::int` })
      .from(tournamentResults)
      .innerJoin(tournaments, eq(tournamentResults.tournamentId, tournaments.id))
      .where(and(
        eq(tournamentResults.playerId, jugador.id),
        sql`${tournamentResults.placement} > 0`,
        sql`${tournaments.topCut} > 0`,
        sql`${tournamentResults.placement} <= ${tournaments.topCut}`,
      ));
    avance.cortes = fila?.n ?? 0;
  } else if (profileTitle === "medallas" || profileTitle === "oro") {
    const partidasPromise = db.select().from(matches).where(and(
      eq(matches.status, "done"),
      or(eq(matches.playerAId, jugador.id), eq(matches.playerBId, jugador.id)),
      sql`(${matches.seriesResult} IS NOT NULL OR EXISTS (
        SELECT 1 FROM ${games} WHERE ${games.matchId} = ${matches.id}
      ))`,
    ));
    const rondasPromise = db.select({ n: sql<number>`count(*)::int` }).from(matches).where(and(
      eq(matches.playerAId, jugador.id),
      isNotNull(matches.tournamentId),
      sql`${matches.firstTurn} <> ''`,
    ));
    const resultadosPromise = db.select({ resultado: tournamentResults, torneo: tournaments })
      .from(tournamentResults)
      .innerJoin(tournaments, eq(tournamentResults.tournamentId, tournaments.id))
      .where(eq(tournamentResults.playerId, jugador.id));
    const [partidas, rondas, filasResultado] = await Promise.all([
      partidasPromise, rondasPromise, resultadosPromise,
    ]);
    const partidaIds = partidas.map((partida) => partida.id);
    const juegosJugador = partidaIds.length
      ? await db.select().from(games).where(inArray(games.matchId, partidaIds))
      : [];
    const juegosPorPartida = new Map<string, typeof juegosJugador>();
    for (const juego of juegosJugador) {
      const lista = juegosPorPartida.get(juego.matchId);
      if (lista) lista.push(juego);
      else juegosPorPartida.set(juego.matchId, [juego]);
    }
    const partidasFull = partidas.map((partida) => ({
      ...partida,
      games: juegosPorPartida.get(partida.id) ?? [],
    }));
    const resultados = filasResultado.map(({ resultado }) => resultado);
    const torneoPorId = new Map(filasResultado.map(({ torneo }) => [torneo.id, torneo]));
    const idsMazo = [...new Set([
      ...partidas.flatMap((partida) => [partida.deckAId, partida.deckBId]),
      ...resultados.map((resultado) => resultado.deckId),
    ].filter((id): id is string => Boolean(id)))];
    const mazos = idsMazo.length ? await db.select().from(decks).where(inArray(decks.id, idsMazo)) : [];
    const mazoPorId = new Map(mazos.map((mazo) => [mazo.id, mazo]));
    const idsArquetipo = [...new Set([
      ...mazos.map((mazo) => mazo.archetypeId),
      ...partidas.flatMap((partida) => [partida.archetypeAId, partida.opponentArchetypeId]),
      ...juegosJugador.flatMap((juego) => [juego.archetypeAId, juego.archetypeBId]),
      ...resultados.map((resultado) => resultado.archetypeId),
    ].filter((id): id is string => Boolean(id)))];
    const arquetipos = idsArquetipo.length
      ? await db.select().from(archetypes).where(inArray(archetypes.id, idsArquetipo))
      : [];
    const arquetipoPorId = new Map(arquetipos.map((arquetipo) => [arquetipo.id, arquetipo]));
    const indiceMazos = deckArchetypeIndex(mazos, arquetipos);
    const filasPuesto: PlacementRow[] = resultados.flatMap((resultado) => {
      const torneo = torneoPorId.get(resultado.tournamentId);
      if (!torneo) return [];
      return [{
        playerId: jugador.id,
        archetypeId: resultado.archetypeId
          ?? (resultado.deckId ? mazoPorId.get(resultado.deckId)?.archetypeId ?? null : null),
        placement: resultado.placement,
        date: torneo.date,
        kind: torneo.kind,
        playerCount: torneo.playerCount,
        topCut: torneo.topCut,
      }];
    });
    const conversion = convStats(filasPuesto);
    const record = playerRecord(partidasFull, jugador.id);
    const badges = badgesOf({
      played: record.played,
      wins: record.wins,
      winRate: (record.winRate ?? 0) * 100,
      bestStreak: longestWinStreak(partidasFull, jugador.id),
      archetypes: archetypeStats(partidasFull, indiceMazos, jugador.id, arquetipoPorId).length,
      tournaments: resultados.length,
      cuts: conversion.cut,
      bestPlacement: filasPuesto
        .filter((fila) => fila.placement != null && fila.placement > 0)
        .reduce<number | null>((best, fila) =>
          best == null || fila.placement! < best ? fila.placement! : best, null),
      cp: computeCp(cfg.cpSeason, filasResultado.flatMap(({ resultado, torneo }) => {
        if ((torneo.season ?? seasonOfDate(torneo.date)) !== cfg.cpSeason) return [];
        return [{
          id: resultado.id,
          kind: cpKindOf(torneo),
          date: torneo.date,
          placement: resultado.placement,
          playerCount: torneo.playerCount,
          cpEarned: resultado.cpEarned,
          cpManual: resultado.cpManual,
          tournamentName: torneo.name,
        } satisfies CpResultInput];
      })).total,
      roundsWithTurn: rondas[0]?.n ?? 0,
    });
    const ganadas = badges.filter((badge) => badge.tier !== "none");
    avance.medallas = ganadas.length;
    avance.medallasOro = ganadas.filter((badge) => badge.tier === "gold").length;
    avance.liga = partidasFull.filter(isPlayed).filter((partida) => partida.competitionId !== null).length;
    avance.torneos = resultados.length;
    avance.cortes = conversion.cut;
  }

  return tituloDePerfil(profileTitle, logros, avance);
}
