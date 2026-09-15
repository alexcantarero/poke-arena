import { test } from "node:test";
import assert from "node:assert/strict";
import {
  archetypesOfMatch, metaShare, outcome, performanceByRoundNumber, roundResult, roundStage,
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
