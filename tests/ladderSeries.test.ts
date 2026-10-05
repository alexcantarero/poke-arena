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

test("Elo: se salta el valor inicial sin fecha y separa partidas del mismo día", () => {
  const s = seriesElo({ a: [{ date: "", value: 1000 }, { date: "2026-09-01", value: 1012 }, { date: "2026-09-01", value: 1020.4 }] });
  const p = s.get("a")!;
  assert.equal(p.length, 2);
  assert.equal(p[1].t - p[0].t, 60_000);
  assert.equal(p[1].elo, 1020);
});
