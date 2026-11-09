import test from "node:test";
import assert from "node:assert/strict";
import { isPlayed, recordOf, roundsOf } from "../src/lib/stats.ts";
import type { MatchFull } from "../src/lib/types.ts";

/* v0.114 — el BYE de una ronda de torneo: lo que guarda `saveTournamentRound`
   (contra «BYE», sin rival, sin mazos ni juegos, `seriesResult = "a"`). */
const ronda = (round: number, extra: Partial<MatchFull>): MatchFull => ({
  id: `r${round}`, competitionId: null, tournamentId: "t1", round, date: "2026-11-21",
  playerAId: "ibai", playerBId: null, opponentPlayerId: null, opponentName: "Rival",
  deckAId: null, deckBId: null, opponentArchetypeId: null, archetypeAId: "dragapult",
  bestOf: 3, status: "done", seriesResult: null, firstTurn: "", note: "",
  createdBy: null, updatedBy: null, updatedAt: null, createdAt: new Date(), games: [],
  ...extra,
});

test("un bye cuenta como victoria en el récord del torneo (3 puntos)", () => {
  const rondas = [
    ronda(1, { opponentName: "BYE", seriesResult: "a" }),
    ronda(2, { seriesResult: "b", opponentArchetypeId: "gardevoir" }),
  ];
  const r = recordOf(roundsOf(rondas, "t1", "ibai"));
  assert.equal(r.wins, 1);
  assert.equal(r.losses, 1);
  assert.equal(r.points, 3);
  assert.equal(r.open, 0);
});

test("un bye no es una partida jugada: fuera de mazos, matriz y Elo", () => {
  assert.equal(isPlayed(ronda(1, { opponentName: "BYE", seriesResult: "a" })), false);
  assert.equal(isPlayed(ronda(1, { opponentName: " bye ", seriesResult: "a" })), false);
  // Un rival que se llama distinto sí cuenta.
  assert.equal(isPlayed(ronda(2, { opponentName: "Byers", seriesResult: "a" })), true);
});
