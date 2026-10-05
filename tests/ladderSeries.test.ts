import { test } from "node:test";
import assert from "node:assert/strict";
import { seriesLadder } from "../src/lib/ladderSeries.ts";

const d = (s: string) => new Date(`${s}T12:00:00Z`);

test("un punto por inserción, en orden", () => {
  const s = seriesLadder([
    { playerId: "a", elo: 1600, at: d("2026-09-20") },
    { playerId: "a", elo: 1500, at: d("2026-09-14") },
  ], []);
  assert.deepEqual(s.get("a")!.map((p) => p.elo), [1500, 1600]);
});

test("el reset corta la línea con un hueco", () => {
  const s = seriesLadder([
    { playerId: "a", elo: 1750, at: d("2026-09-20") },
    { playerId: "a", elo: 484, at: d("2026-10-03") },
  ], [d("2026-10-01")]);
  assert.deepEqual(s.get("a")!.map((p) => p.elo), [1750, null, 484]);
});

test("un reset antes del primer punto no mete hueco al principio", () => {
  const s = seriesLadder([{ playerId: "a", elo: 500, at: d("2026-10-03") }], [d("2026-10-01")]);
  assert.deepEqual(s.get("a")!.map((p) => p.elo), [500]);
});

import { seriesElo } from "../src/lib/ladderSeries.ts";

test("Elo: eje X = orden de partida; arranca en el Elo inicial", () => {
  const { series, fechas } = seriesElo({
    a: [{ date: "", value: 1000 }, { date: "2026-09-01", value: 1012, i: 3 }, { date: "2026-09-01", value: 1020.4, i: 5 }],
  });
  const p = series.get("a")!;
  assert.deepEqual(p.map((x) => x.t), [2, 3, 5]);
  assert.deepEqual(p.map((x) => x.elo), [1000, 1012, 1020]);
  assert.deepEqual(fechas[0], [3, "2026-09-01"]);
});
