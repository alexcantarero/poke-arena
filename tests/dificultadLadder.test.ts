import { test } from "node:test";
import assert from "node:assert/strict";
import { resumenDificultad, nivelValido } from "../src/lib/dificultad.ts";
import { liveConPeso, pesoLadder, rangoDelPeriodo } from "../src/lib/ladderPeso.ts";

test("dificultad: la media de todos los votos, redondeada al nivel más cercano", () => {
  assert.equal(resumenDificultad([]), null);
  assert.deepEqual(resumenDificultad([2, 3, 3, 4]), { media: 3, nivel: 3, votos: 4 });
  assert.equal(resumenDificultad([4, 5])!.nivel, 5); // 4,5 sube
  assert.equal(resumenDificultad([1, 2, 2])!.nivel, 2);
  assert.deepEqual(resumenDificultad([9, 0, "x" as unknown as number, 1]), { media: 1, nivel: 1, votos: 1 });
  assert.equal(nivelValido("3"), 3);
  assert.equal(nivelValido(3.5), null);
});

test("pesos del ladder: una victoria a 1700 vale más que a 200", () => {
  assert.deepEqual([null, 200, 550, 1400, 1500, 1650, 1720, 1850, 1950, 2100].map(pesoLadder), [1, 0.5, 0.5, 0.8, 1, 1.15, 1.3, 1.45, 1.6, 1.8]);
});

test("el rango de un periodo: media de lo apuntado dentro; si no, el último de antes; si no, el actual", () => {
  const e = [{ elo: 1500, fecha: "2026-11-01" }, { elo: 1600, fecha: "2026-11-10" }, { elo: 1700, fecha: "2026-11-12" }];
  assert.equal(rangoDelPeriodo(e, "2026-11-09", "2026-11-15"), 1650);
  assert.equal(rangoDelPeriodo(e, "2026-11-05", "2026-11-08"), 1500);
  assert.equal(rangoDelPeriodo([], "2026-11-05", "2026-11-08", 1420), 1420);
  assert.equal(rangoDelPeriodo([], "2026-11-05", "2026-11-08"), null);
});

test("el % ponderado: las sesiones con su peso y lo antiguo (sin sesión) a peso 1", () => {
  // 10-0 a 200 (peso 0,5) y 0-10 a 1750 (peso 1,3): el simple dice 50 %, el ponderado bastante menos.
  const r = liveConPeso([{ wins: 10, losses: 0, rango: 200 }, { wins: 0, losses: 10, rango: 1750 }]);
  assert.equal(r.pctSimple, 0.5);
  assert.ok(Math.abs(r.pctPonderado! - 5 / 18) < 1e-9);
  // Un total de 30-10 en el mazo con solo 10-0 en sesiones: 20-10 más a peso 1.
  const m = liveConPeso([{ wins: 10, losses: 0, rango: 1800 }], 30, 10);
  assert.deepEqual([m.wins, m.losses, m.played], [30, 10, 40]);
  assert.ok(Math.abs(m.pctPonderado! - (14.5 + 20) / (14.5 + 30)) < 1e-9);
  assert.equal(liveConPeso([]).pctPonderado, null);
});
