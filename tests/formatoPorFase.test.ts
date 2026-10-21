import { test } from "node:test";
import assert from "node:assert/strict";
import { bestOfDeRonda, faseDeRonda } from "../src/lib/estructura.ts";

test("torneo de tienda con 5 rondas tecleadas y top 8: la 6 es del corte", () => {
  const t = { kind: "store", rounds: 5, topCut: 8, bestOf: 1, bestOfTop: 3 };
  assert.equal(faseDeRonda(t, 5), "suizo");
  assert.equal(faseDeRonda(t, 6), "corte");
  assert.equal(bestOfDeRonda(t, 3), 1);
  assert.equal(bestOfDeRonda(t, 6), 3);
});

test("sin formato de corte, el corte juega como el suizo", () => {
  const t = { kind: "store", rounds: 5, topCut: 8, bestOf: 3, bestOfTop: null };
  assert.equal(bestOfDeRonda(t, 7), 3);
});

test("Regional: el suizo sale de la asistencia oficial, no de lo tecleado", () => {
  // 3.342 jugadores → 8 + 6 = 14 rondas de suizo (Variante #5).
  const t = { kind: "regional", playerCount: 3342, bestOf: 3, bestOfTop: 5 };
  assert.equal(faseDeRonda(t, 14), "suizo");
  assert.equal(faseDeRonda(t, 15), "corte");
  assert.equal(bestOfDeRonda(t, 15), 5);
});

test("sin suizo conocido, todo es suizo, y un formato raro cae a Bo3", () => {
  assert.equal(faseDeRonda({ kind: "other" }, 9), "suizo");
  assert.equal(bestOfDeRonda({ kind: "other", bestOf: 7 }, 1), 3);
});
