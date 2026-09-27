import { test } from "node:test";
import assert from "node:assert/strict";
import {
  archetypesOfMatch, metaShare, outcome, performanceByRoundNumber, roundResult, roundStage,
  suggestedRounds, suggestedTopCut,
} from "../src/lib/stats.ts";
import type { Archetype, MatchFull } from "../src/lib/types.ts";

/* ----------------------------------------------------- utilidades de test -- */

const arch = (id: string, name = id): Archetype => ({
  id, name, main: id, secondary: "", type: "colorless", limitlessId: null,
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

/* ------------------------------------------------------------ roundStage -- */

test("roundStage: dentro de las rondas de suizo declaradas", () => {
  assert.deepEqual(roundStage(1, 5, 8), { kind: "swiss", label: "Suizo" });
  assert.deepEqual(roundStage(5, 5, 8), { kind: "swiss", label: "Suizo" });
});

test("roundStage: el top cut se nombra desde el final hacia atrás", () => {
  // Top 8 = 3 rondas de cuadro: cuartos, semi, final.
  assert.deepEqual(roundStage(6, 5, 8), { kind: "cut", label: "Cuartos" });
  assert.deepEqual(roundStage(7, 5, 8), { kind: "cut", label: "Semifinal" });
  assert.deepEqual(roundStage(8, 5, 8), { kind: "cut", label: "Final" });
});

test("roundStage: top 32 tiene cinco rondas de cuadro", () => {
  assert.deepEqual(roundStage(6, 5, 32), { kind: "cut", label: "Dieciseisavos" });
  assert.deepEqual(roundStage(7, 5, 32), { kind: "cut", label: "Octavos" });
  assert.deepEqual(roundStage(10, 5, 32), { kind: "cut", label: "Final" });
});

test("roundStage: sin rondas de suizo declaradas, todo es suizo", () => {
  assert.equal(roundStage(9, null, 8).kind, "swiss");
});

test("roundStage: más allá de lo que el top cut explica, se llama solo Top cut", () => {
  // topCut chico pero se siguen apuntando rondas por encima (torneo que
  // recorta o crece más de lo anunciado): no se inventa un nombre.
  assert.deepEqual(roundStage(20, 5, 8), { kind: "cut", label: "Top cut" });
});

test("roundStage: estructura regional estándar (12 suizas: 8 Día 1 + 4 Día 2 + Top 8)", () => {
  // Día 1: rondas 1 a 8
  assert.deepEqual(roundStage(1, 12, 8), { kind: "swiss", label: "Día 1", day: 1 });
  assert.deepEqual(roundStage(8, 12, 8), { kind: "swiss", label: "Día 1", day: 1 });
  // Día 2: rondas 9 a 12
  assert.deepEqual(roundStage(9, 12, 8), { kind: "swiss", label: "Día 2", day: 2 });
  assert.deepEqual(roundStage(12, 12, 8), { kind: "swiss", label: "Día 2", day: 2 });
  // Top 8: rondas 13 (cuartos), 14 (semi), 15 (final)
  assert.deepEqual(roundStage(13, 12, 8), { kind: "cut", label: "Cuartos" });
  assert.deepEqual(roundStage(14, 12, 8), { kind: "cut", label: "Semifinal" });
  assert.deepEqual(roundStage(15, 12, 8), { kind: "cut", label: "Final" });
});

test("roundStage: estructura regional de 14 suizas (2049–4096: 8 Día 1 + 6 Día 2 + Top 8)", () => {
  const options = { playerCount: 2500 };
  // Día 1: rondas 1 a 8
  assert.deepEqual(roundStage(1, 14, 8, options), { kind: "swiss", label: "Día 1", day: 1 });
  assert.deepEqual(roundStage(8, 14, 8, options), { kind: "swiss", label: "Día 1", day: 1 });
  // Día 2: rondas 9 a 14
  assert.deepEqual(roundStage(9, 14, 8, options), { kind: "swiss", label: "Día 2", day: 2 });
  assert.deepEqual(roundStage(14, 14, 8, options), { kind: "swiss", label: "Día 2", day: 2 });
  // Top 8: rondas 15, 16, 17
  assert.deepEqual(roundStage(15, 14, 8, options), { kind: "cut", label: "Cuartos" });
  assert.deepEqual(roundStage(16, 14, 8, options), { kind: "cut", label: "Semifinal" });
  assert.deepEqual(roundStage(17, 14, 8, options), { kind: "cut", label: "Final" });
});

test("roundStage: estructura regional de 15 suizas (4097–8192: 9 Día 1 + 6 Día 2 + Top 8)", () => {
  const options = { playerCount: 5000 };
  // Día 1: rondas 1 a 9
  assert.deepEqual(roundStage(1, 15, 8, options), { kind: "swiss", label: "Día 1", day: 1 });
  assert.deepEqual(roundStage(9, 15, 8, options), { kind: "swiss", label: "Día 1", day: 1 });
  // Día 2: rondas 10 a 15
  assert.deepEqual(roundStage(10, 15, 8, options), { kind: "swiss", label: "Día 2", day: 2 });
  assert.deepEqual(roundStage(15, 15, 8, options), { kind: "swiss", label: "Día 2", day: 2 });
  // Top 8: rondas 16, 17, 18
  assert.deepEqual(roundStage(16, 15, 8, options), { kind: "cut", label: "Cuartos" });
  assert.deepEqual(roundStage(17, 15, 8, options), { kind: "cut", label: "Semifinal" });
  assert.deepEqual(roundStage(18, 15, 8, options), { kind: "cut", label: "Final" });
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
      { id: 1, matchId: "m", number: 1, winner: "a", first: "a", prizesLeft: null, turns: null, note: "" },
      { id: 2, matchId: "m", number: 2, winner: "tie", first: "b", prizesLeft: null, turns: null, note: "" },
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
      { id: 1, matchId: "m", number: 1, winner: "a", first: "a", prizesLeft: null, turns: null, note: "" },
      { id: 2, matchId: "m", number: 2, winner: "b", first: "b", prizesLeft: null, turns: null, note: "" },
      { id: 3, matchId: "m", number: 3, winner: "tie", first: "a", prizesLeft: null, turns: null, note: "" },
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
