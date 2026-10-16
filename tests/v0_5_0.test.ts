import { test } from "node:test";
import assert from "node:assert/strict";
import {
  archetypesOfMatch, matchupMatrix, metaShare, outcome, performanceByRoundNumber, roundResult,
} from "../src/lib/stats.ts";
import { suggestedRounds, suggestedTopCut } from "../src/lib/sugerencias.ts";
import type { Archetype, MatchFull } from "../src/lib/types.ts";

/* ----------------------------------------------------- utilidades de test -- */

const arch = (id: string, name = id): Archetype => ({
  id, name, main: id, secondary: "", type: "colorless", limitlessId: null, parentId: null,
});

const A = arch("a-dragapult", "Dragapult ex");
const B = arch("a-gardevoir", "Gardevoir ex");

let seq = 0;
const match = (over: Partial<MatchFull> = {}): MatchFull => ({
  id: `m${seq++}`,
  competitionId: null,
  tournamentId: "t1",
  round: 1,
  date: "2026-09-01",
  playerAId: "p1",
  playerBId: null,
  opponentPlayerId: null,
  opponentName: "Rival",
  deckAId: null,
  archetypeAId: A.id,
  deckBId: null,
  opponentArchetypeId: B.id,
  bestOf: 3,
  status: "done",
  seriesResult: null,
  firstTurn: "",
  note: "",
  createdBy: null,
  createdAt: new Date(),
  games: [],
  ...over,
});





test("matchupMatrix: agrupar combina variantes y recalcula el porcentaje de victorias", () => {
  const varianteA = arch("dragapult-dudunsparce");
  const varianteB = arch("dragapult-blaziken");
  const index = new Map<string, Archetype | undefined>();
  const byId = new Map([
    [varianteA.id, varianteA],
    [varianteB.id, varianteB],
    [B.id, B],
  ]);
  const parent = new Map([
    [varianteA.id, "dragapult"],
    [varianteB.id, "dragapult"],
    [B.id, B.id],
  ]);
  const matrix = matchupMatrix(
    [
      match({ archetypeAId: varianteA.id, opponentArchetypeId: B.id, seriesResult: "a" }),
      match({ archetypeAId: varianteB.id, opponentArchetypeId: B.id, seriesResult: "b" }),
    ],
    index,
    1,
    byId,
    (id) => parent.get(id) ?? id,
  );

  assert.deepEqual(matrix.cell("dragapult", B.id), { n: 2, wins: 1, winRate: 0.5 });
  assert.ok(matrix.ids.includes("dragapult"));
});






test("suggestedRounds: según el Play! Pokémon Tournament Rules Handbook (Variant #5)", () => {
  assert.equal(suggestedRounds(100, "regional"), 9);   // 65–128: 9 rondas
  assert.equal(suggestedRounds(200, "regional"), 10);  // 129–256: 10 rondas
  assert.equal(suggestedRounds(400, "regional"), 11);  // 257–512: 11 rondas
  assert.equal(suggestedRounds(800, "regional"), 12);  // 513–1024: 12 rondas
  assert.equal(suggestedRounds(1500, "regional"), 13); // 1025–2048: 13 rondas
  assert.equal(suggestedRounds(2500, "regional"), 14); // 2049–4096: 14 rondas
  assert.equal(suggestedRounds(5000, "regional"), 15); // 4097–8192: 15 rondas

  // Torneos pequeños estándar (League Cup - Variant #3)
  assert.equal(suggestedRounds(8, "league_cup"), 3);
  assert.equal(suggestedRounds(12, "league_cup"), 4);
  assert.equal(suggestedRounds(32, "league_cup"), 5);
  assert.equal(suggestedRounds(64, "league_cup"), 6);
  assert.equal(suggestedRounds(128, "league_cup"), 7);
});

test("suggestedTopCut: regional propone Top 8", () => {
  assert.equal(suggestedTopCut(500, "regional"), 8);
  assert.equal(suggestedTopCut(2500, "regional"), 8);
  assert.equal(suggestedTopCut(32, "league_cup"), 8);
  assert.equal(suggestedTopCut(16, "league_challenge"), 0);
  assert.equal(suggestedTopCut(6, "store"), 0);
});

/* -------------------------------------------------------------- metaShare -- */

test("metaShare: cada lado de cada partida cuenta por separado", () => {
  const index = new Map<string, Archetype | undefined>();
  const archById = new Map([[A.id, A], [B.id, B]]);
  const matches = [
    match({ round: 1, seriesResult: "a" }),
    match({ round: 2, seriesResult: "a" }),
  ];
  const rows = metaShare(matches, index, archById);
  const total = rows.reduce((a, r) => a + r.n, 0);
  assert.equal(total, 4); // 2 partidas x 2 lados
  const dragapult = rows.find((r) => r.archetypeId === A.id);
  const gardevoir = rows.find((r) => r.archetypeId === B.id);
  assert.equal(dragapult?.n, 2);
  assert.equal(gardevoir?.n, 2);
  assert.equal(dragapult?.share, 0.5);
});

test("metaShare: sinceISO deja fuera lo anterior a esa fecha", () => {
  const index = new Map<string, Archetype | undefined>();
  const archById = new Map([[A.id, A], [B.id, B]]);
  const matches = [
    match({ date: "2026-01-01", seriesResult: "a" }),
    match({ date: "2026-09-01", seriesResult: "a" }),
  ];
  const rows = metaShare(matches, index, archById, "2026-06-01");
  const total = rows.reduce((a, r) => a + r.n, 0);
  assert.equal(total, 2); // solo la partida de septiembre
});

/* ------------------------------------------------- performanceByRoundNumber -- */

test("performanceByRoundNumber: solo mira rondas de torneo, agrupadas por número", () => {
  const matches = [
    match({ round: 1, seriesResult: "a" }), // gana
    match({ round: 1, seriesResult: "a", id: "otro-jugador", playerAId: "p2" }), // no es de p1
    match({ round: 2, seriesResult: "b" }), // pierde
    match({ round: 2, seriesResult: "a" }), // gana
    match({ round: 3, tournamentId: null, seriesResult: "a" }), // sin torneo, no cuenta
  ];
  const rows = performanceByRoundNumber(matches, "p1");
  assert.deepEqual(rows.map((r) => r.round), [1, 2]);
  assert.equal(rows[0].wins, 1);
  assert.equal(rows[0].played, 1);
  assert.equal(rows[1].wins, 1);
  assert.equal(rows[1].losses, 1);
  assert.equal(rows[1].winRate, 0.5);
});

/* --------------------------------------- empate en un juego decide la ronda -- */

test("un juego empatado decide la ronda por mayoría de juegos ganados hasta ahí", () => {
  // Simula lo que hace saveTournamentRound: juego 1 lo gana el jugador,
  // juego 2 empata (el reloj corta la ronda ahí), y seriesResult se calcula
  // sin necesidad del checkbox "se acabó el tiempo".
  const m = match({
    bestOf: 3,
    seriesResult: "a", // 1 juego ganado contra 0: gana la ronda
    games: [
      { id: 1, matchId: "m", number: 1, winner: "a", first: "a", prizesA: null, prizesB: null, penaltyA: false, penaltyB: false, turns: null, note: "", mulligansA: 0, mulligansB: 0, archetypeAId: null, archetypeBId: null },
      { id: 2, matchId: "m", number: 2, winner: "tie", first: "b", prizesA: null, prizesB: null, penaltyA: false, penaltyB: false, turns: null, note: "", mulligansA: 0, mulligansB: 0, archetypeAId: null, archetypeBId: null },
    ],
  });
  assert.equal(roundResult(m), "w");
  assert.equal(outcome(m).winner, "a"); // 1-0, con el empate aparte
});

test("empate a juegos ganados con un empate de por medio: la ronda es empate", () => {
  const m = match({
    bestOf: 3,
    seriesResult: "tie",
    games: [
      { id: 1, matchId: "m", number: 1, winner: "a", first: "a", prizesA: null, prizesB: null, penaltyA: false, penaltyB: false, turns: null, note: "", mulligansA: 0, mulligansB: 0, archetypeAId: null, archetypeBId: null },
      { id: 2, matchId: "m", number: 2, winner: "b", first: "b", prizesA: null, prizesB: null, penaltyA: false, penaltyB: false, turns: null, note: "", mulligansA: 0, mulligansB: 0, archetypeAId: null, archetypeBId: null },
      { id: 3, matchId: "m", number: 3, winner: "tie", first: "a", prizesA: null, prizesB: null, penaltyA: false, penaltyB: false, turns: null, note: "", mulligansA: 0, mulligansB: 0, archetypeAId: null, archetypeBId: null },
    ],
  });
  assert.equal(roundResult(m), "d");
});

/* ----------------------------------- archetypeAId resuelve el mazo propio -- */

test("archetypesOfMatch cae al arquetipo propio cuando no hay mazo con lista", () => {
  const index = new Map<string, Archetype | undefined>();
  const archById = new Map([[A.id, A], [B.id, B]]);
  const m = match({ deckAId: null, archetypeAId: A.id, deckBId: null, opponentArchetypeId: B.id });
  const { a, b } = archetypesOfMatch(m, index, archById);
  assert.equal(a?.id, A.id);
  assert.equal(b?.id, B.id);
});

/* ------------------------------------ v0.13: el Día 2 es solo de Regional -- */


test("v0.13 · suggestedTopCut: el Challenge nunca tiene corte", () => {
  assert.equal(suggestedTopCut(200, "league_challenge"), 0);
  assert.equal(suggestedTopCut(200, "pokemon_challenge"), 0);
  assert.equal(suggestedTopCut(8, "league_cup"), 0);
  assert.equal(suggestedTopCut(12, "league_cup"), 4);
  assert.equal(suggestedRounds(300, "pokemon_cup"), 9);
});
