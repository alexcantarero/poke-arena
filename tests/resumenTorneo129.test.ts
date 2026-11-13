import { test } from "node:test";
import assert from "node:assert/strict";
import { columnasDeRondas, eloDeTorneo } from "../src/lib/resumenTorneo.ts";

test("el Elo del torneo: sus rondas más el bonus por puesto, y nada de otros torneos", () => {
  const h = [
    { delta: 12.4, matchId: "m1" }, { delta: -8.2, matchId: "m2" }, { delta: 20, matchId: "otra" },
    { delta: 25, tournamentId: "t1", bonus: true }, { delta: 40, tournamentId: "t2", bonus: true },
    { matchId: "m3" }, // sin delta: el primer punto del historial
  ];
  assert.deepEqual(eloDeTorneo(h, "t1", new Set(["m1", "m2", "m3"])), { total: 29, rondas: 4, bonus: 25 });
  assert.equal(eloDeTorneo(h, "t9", new Set(["zzz"])), null); // ese torneo no movió el Elo
  assert.deepEqual(eloDeTorneo([{ delta: -30, matchId: "m1" }], "t1", new Set(["m1"])), { total: -30, rondas: -30, bonus: 0 });
});

test("las rondas en la imagen: una columna hasta 8, dos hasta 16, y de ahí no pasa", () => {
  const n = (k: number) => Array.from({ length: k }, (_, i) => i + 1);
  assert.deepEqual(columnasDeRondas(n(5)), [[1, 2, 3, 4, 5]]);
  assert.deepEqual(columnasDeRondas(n(9)).map((c) => c.length), [5, 4]);
  assert.deepEqual(columnasDeRondas(n(14)).map((c) => c.length), [7, 7]);
  assert.deepEqual(columnasDeRondas(n(20)).map((c) => c.length), [8, 8]);
  assert.deepEqual(columnasDeRondas([]), [[]]);
});
