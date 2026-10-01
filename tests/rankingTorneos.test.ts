import { test } from "node:test";
import assert from "node:assert/strict";
import { rankingTorneos } from "../src/lib/rankingTorneos.ts";

const e = (o: Partial<Parameters<typeof rankingTorneos>[0][number]>) => ({
  playerId: "ibai", tournamentId: "t1", placement: null, topCut: null,
  wins: 0, losses: 0, ties: 0, ...o,
});

test("la conversión solo cuenta torneos con corte", () => {
  const [f] = rankingTorneos([
    e({ tournamentId: "c1", placement: 6, topCut: null, wins: 3, losses: 2 }),   // Challenge, sin corte
    e({ tournamentId: "cup", placement: 5, topCut: 8, wins: 4, losses: 1 }),    // entra
    e({ tournamentId: "cup2", placement: 16, topCut: 8, wins: 3, losses: 3 }),  // no entra
  ]);
  assert.equal(f.torneos, 3);
  assert.equal(f.conCorte, 2);
  assert.equal(f.cortes, 1);
  assert.equal(f.cutRate, 0.5);
  assert.equal(f.avgPlacement, 9);
  assert.equal(f.bestPlacement, 5);
  assert.equal(f.wins, 10);
});

test("sin torneos con corte, la conversión es null, no 0", () => {
  const [f] = rankingTorneos([e({ placement: 3, wins: 4, losses: 1 })]);
  assert.equal(f.cutRate, null);
});

test("sin puesto no hay media; un torneo repetido cuenta una vez", () => {
  const [f] = rankingTorneos([e({ wins: 2, losses: 3, dropped: true }), e({ wins: 2, losses: 3, dropped: true })]);
  assert.equal(f.torneos, 1);
  assert.equal(f.avgPlacement, null);
  assert.equal(f.drops, 1);
  assert.equal(f.winRate, 0.4);
});

test("ordena por CP por defecto", () => {
  const filas = rankingTorneos(
    [e({ playerId: "a" }), e({ playerId: "b" })],
    (id) => (id === "b" ? 23 : 8),
  );
  assert.deepEqual(filas.map((f) => f.playerId), ["b", "a"]);
});
