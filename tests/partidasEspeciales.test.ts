import { test } from "node:test";
import assert from "node:assert/strict";
import { eloTable, standings } from "../src/lib/stats.ts";

let n = 0;
const m = (o: Record<string, unknown>) => ({
  id: `p${++n}`, competitionId: "liga", tournamentId: null, round: 1, date: "2026-11-10", status: "done",
  playerAId: "a", playerBId: "b", opponentPlayerId: null, opponentName: null, deckAId: null, deckBId: null,
  opponentArchetypeId: null, archetypeAId: null, bestOf: 3, seriesResult: null, firstTurn: "", note: "",
  createdBy: null, updatedBy: null, updatedAt: null, createdAt: new Date(), games: [], ...o,
}) as never;
const cfg = { ptsWin: 3, ptsTie: 1, ptsLoss: 0, eloStart: 1000 };

test("v0.123: en una liga, el BYE de quien descansa cuenta como victoria (3 puntos)", () => {
  const t = standings([m({ playerBId: null, opponentName: "BYE", seriesResult: "a" })], ["a", "b"], {}, cfg);
  const a = t.find((r) => r.playerId === "a")!;
  assert.equal(a.wins, 1);
  assert.equal(a.points, 3);
  assert.equal(t.find((r) => r.playerId === "b")!.played, 0);
});

test("v0.123: un BYE de torneo (sin liga) no entra en la clasificación de liga", () => {
  const t = standings([m({ competitionId: null, tournamentId: "t", playerBId: null, opponentName: "BYE", seriesResult: "a" })], ["a"], {}, cfg);
  assert.equal(t[0].played, 0);
});

test("v0.123: no presentado — cuenta en la clasificación, no en el Elo", () => {
  const np = m({ seriesResult: "a", note: "No presentado: b" });
  const t = standings([np], ["a", "b"], {}, cfg);
  assert.equal(t.find((r) => r.playerId === "a")!.points, 3);
  const e = eloTable([np], [{ id: "a" }, { id: "b" }] as never, { eloStart: 1000, eloK: 24, eloScope: "all", eloSince: null });
  assert.equal(e.rating.a, 1000);
  assert.equal(e.rating.b, 1000);
});
