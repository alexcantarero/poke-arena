import { badgesOf, type BadgeInput } from "@/lib/badges";
import { playerCp, type Snapshot } from "@/lib/data";
import { leerLogros, type AvanceTitulos } from "@/lib/logros";
import { archetypeStats, isPlayed, longestWinStreak, playerRecord, sideOf } from "@/lib/stats";
import { convStats, type PlacementRow } from "@/lib/tournamentStats";

function resultadosDeJugador(snap: Snapshot, playerId: string): PlacementRow[] {
  return snap.tournaments.flatMap((t) => {
    const r = t.results.find((result) => result.playerId === playerId);
    if (!r) return [];
    return [{
      playerId,
      archetypeId: r.archetypeId
        ?? (r.deckId ? snap.decksById.get(r.deckId)?.archetypeId ?? null : null),
      placement: r.placement ?? null,
      date: t.date,
      kind: t.kind,
      playerCount: t.playerCount ?? null,
      topCut: t.topCut ?? null,
    }];
  });
}

export function entradaMedallasDeJugador(snap: Snapshot, playerId: string): BadgeInput {
  const all = snap.matches.filter(isPlayed);
  const mine = all.filter((match) => sideOf(match, playerId));
  const total = playerRecord(mine, playerId);
  const tournaments = snap.tournaments.filter((t) => t.results.some((r) => r.playerId === playerId));
  const placements = resultadosDeJugador(snap, playerId);
  const conv = convStats(placements);
  const bestPlacement = placements
    .filter((r) => r.placement != null && r.placement > 0)
    .reduce<number | null>((best, r) => best == null || r.placement! < best ? r.placement! : best, null);
  const archetypes = archetypeStats(mine, snap.archIndex, playerId, snap.archById);
  const cp = playerCp(snap, playerId);

  return {
    played: total.played,
    wins: total.wins,
    bestStreak: longestWinStreak(all, playerId),
    archetypes: archetypes.length,
    tournaments: tournaments.length,
    cuts: conv.cut,
    bestPlacement,
    cp: cp.total,
    winRate: (total.winRate ?? 0) * 100,
    roundsWithTurn: snap.matches.filter(
      (match) => match.tournamentId && match.playerAId === playerId && Boolean(match.firstTurn),
    ).length,
  };
}

export function avanceTitulosDeJugador(
  snap: Snapshot,
  playerId: string,
  badgeInput: BadgeInput,
): AvanceTitulos {
  const matches = snap.matches.filter((match) =>
    isPlayed(match) && sideOf(match, playerId),
  );
  const tournaments = snap.tournaments.filter((t) => t.results.some((r) => r.playerId === playerId));
  const badges = badgesOf(badgeInput);
  const earned = badges.filter((badge) => badge.tier !== "none");

  return {
    liga: matches.filter((match) => match.competitionId !== null).length,
    torneos: tournaments.length,
    cortes: convStats(resultadosDeJugador(snap, playerId)).cut,
    medallas: earned.length,
    medallasOro: earned.filter((badge) => badge.tier === "gold").length,
    logros: leerLogros(snap.playersById.get(playerId)?.logros).length,
  };
}
