import { test } from "node:test";
import assert from "node:assert/strict";
import { computeCp, cpKindOf, effectiveCp } from "../src/lib/cp.ts";

test("un torneo online no da CP aunque sea un League Challenge", () => {
  const kind = cpKindOf({ kind: "league_challenge", scope: "online" });
  assert.equal(kind, "online");
  assert.equal(effectiveCp(2027, kind, { placement: 1, cpEarned: 0, cpManual: false }, 40), 0);
  assert.equal(effectiveCp(2027, kind, { placement: 1, cpEarned: 15, cpManual: true }, 40), 0);
  assert.equal(cpKindOf({ kind: "league_challenge", scope: "onsite" }), "league_challenge");
});

test("un resultado de 0 CP no ocupa hueco del Best Finish Limit", () => {
  const row = (id: string, placement: number, playerCount: number) => ({
    id, kind: "league_challenge", date: `2026-09-${id}`, placement, playerCount,
    cpEarned: 0, cpManual: false, tournamentName: id,
  });
  // Monstercards 1.º/12 = 15 · DeckTCG 6.º/32 = 8 · Gameria 12.º/20 = 0 (pide 25)
  const cp = computeCp(2027, [row("30", 1, 12), row("19", 6, 32), row("12", 12, 20)]);
  const b = cp.buckets.find((x) => x.bucket === "league_challenge")!;
  assert.equal(b.counting, 2);
  assert.equal(b.spare, 2);
  assert.equal(cp.total, 23);
  assert.equal(cp.rows.find((r) => r.id === "12")!.excluded, false);
});

test("con el límite lleno, el quinto que puntúa sí queda fuera", () => {
  const r = (id: string, placement: number) => ({
    id, kind: "league_challenge", date: `2026-10-0${id}`, placement, playerCount: 40,
    cpEarned: 0, cpManual: false, tournamentName: id,
  });
  const cp = computeCp(2027, [r("1", 1), r("2", 1), r("3", 2), r("4", 2), r("5", 5)]);
  assert.equal(cp.total, 15 + 15 + 12 + 12);
  assert.equal(cp.rows.find((x) => x.id === "5")!.excluded, true);
});
