import { test } from "node:test";
import assert from "node:assert/strict";
import { nextStarter, recordOf, roundResult, toRoundView } from "../src/lib/stats.ts";
import type { Game, MatchFull } from "../src/lib/types.ts";

/* Rondas de un torneo de fuera.

   Lo que se prueba aquí no es aritmética: es que las tres formas de saber cómo
   acabó una ronda —los juegos, el resultado declarado y «se acabó el tiempo»—
   se combinan en el orden correcto. Sobre todo el caso que es fácil de
   confundir: un 1–1 en un Bo3 puede ser una ronda a medias o un empate, y los
   juegos apuntados son idénticos en los dos casos. */

const g = (number: number, winner: string, first = ""): Game =>
  ({ id: number, matchId: "m", number, winner, first, prizesA: null, prizesB: null, penaltyA: false, penaltyB: false, turns: null, note: "", mulligansA: 0, mulligansB: 0, archetypeAId: null, archetypeBId: null });

const m = (over: Partial<MatchFull> = {}): MatchFull => ({
  id: "m1", competitionId: null, tournamentId: "t1", round: 1, date: "2026-09-01",
  playerAId: "p1", playerBId: null, opponentPlayerId: null, opponentName: "Sara",
  deckAId: null, deckBId: null, opponentArchetypeId: null, archetypeAId: null,
  bestOf: 3, status: "done", seriesResult: null, firstTurn: "",
  note: "", createdBy: null, updatedBy: null, updatedAt: null, createdAt: new Date(), games: [],
  ...over,
});

test("una ronda con mayoría de juegos se resuelve sola", () => {
  assert.equal(roundResult(m({ games: [g(1, "a"), g(2, "a")] })), "w");
  assert.equal(roundResult(m({ games: [g(1, "a"), g(2, "b"), g(3, "b")] })), "l");
  assert.equal(roundResult(m({ bestOf: 1, games: [g(1, "a")] })), "w");
  assert.equal(roundResult(m({ bestOf: 5, games: [g(1, "a"), g(2, "b"), g(3, "a"), g(4, "a")] })), "w");
});

test("un 1–1 sin declarar es una ronda a medias, no un empate", () => {
  assert.equal(roundResult(m({ games: [g(1, "a"), g(2, "b")] })), null);
  assert.equal(roundResult(m({ bestOf: 5, games: [g(1, "a"), g(2, "b"), g(3, "a")] })), null);
});

test("el mismo 1–1 con el tiempo agotado sí es empate", () => {
  assert.equal(roundResult(m({ games: [g(1, "a"), g(2, "b")], seriesResult: "tie" })), "d");
  // Y con 1–0 al agotarse el tiempo, gana quien va por delante.
  assert.equal(roundResult(m({ games: [g(1, "a")], seriesResult: "a" })), "w");
});

test("el registro rápido guarda el resultado sin juegos", () => {
  assert.equal(roundResult(m({ seriesResult: "a" })), "w");
  assert.equal(roundResult(m({ seriesResult: "b" })), "l");
  assert.equal(roundResult(m({ seriesResult: "tie" })), "d");
});

test("una ronda apuntada antes de jugarla queda abierta", () => {
  assert.equal(roundResult(m()), null);
});

test("los juegos mandan sobre el resultado declarado", () => {
  // Si alguien completa el desglose después, es el desglose el que cuenta:
  // así no hay dos verdades para la misma ronda.
  const contradiction = m({ games: [g(1, "b"), g(2, "b")], seriesResult: "a" });
  assert.equal(roundResult(contradiction), "l");
});

test("quién salió primero: el juego 1 manda y firstTurn es el respaldo", () => {
  assert.equal(toRoundView(m({ games: [g(1, "a", "b")], firstTurn: "a" })).firstGameOne, false);
  assert.equal(toRoundView(m({ seriesResult: "a", firstTurn: "a" })).firstGameOne, true);
  assert.equal(toRoundView(m({ seriesResult: "a" })).firstGameOne, null);
});

test("el récord del torneo sale de las rondas y las abiertas no cuentan", () => {
  const rounds = [
    m({ round: 1, games: [g(1, "a"), g(2, "a")] }),   // ganada
    m({ round: 2, seriesResult: "b" }),                // perdida
    m({ round: 3, seriesResult: "tie" }),              // empate
    m({ round: 4, games: [g(1, "a")] }),               // abierta
    m({ round: 5, games: [g(1, "b"), g(2, "b")] }),    // perdida
  ].map(toRoundView);

  const rec = recordOf(rounds);
  assert.deepEqual(
    { wins: rec.wins, losses: rec.losses, ties: rec.ties, open: rec.open },
    { wins: 1, losses: 2, ties: 1, open: 1 },
  );
  assert.equal(rec.label, "1-2-1");
  // Puntuación de Play! Pokémon: 3 por victoria, 1 por empate.
  assert.equal(rec.points, 4);
});

test("quien pierde un juego empieza el siguiente", () => {
  assert.equal(nextStarter("a"), "b");
  assert.equal(nextStarter("b"), "a");
});
