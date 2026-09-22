import { test } from "node:test";
import assert from "node:assert/strict";
import {
  binomial, cutLine, cutOutlook, expectedWithAtLeast, matchPoints,
  recordLabel, scenarios, verdictFor, type Record3,
} from "../src/lib/cut.ts";

const r = (wins: number, losses: number, ties = 0): Record3 => ({ wins, losses, ties });

/* ------------------------------------------------------------ aritmética -- */

test("binomial: los casos de siempre", () => {
  assert.equal(binomial(5, 0), 1);
  assert.equal(binomial(5, 5), 1);
  assert.equal(binomial(5, 1), 5);
  assert.equal(binomial(5, 2), 10);
  assert.equal(binomial(6, 3), 20);
  assert.equal(binomial(9, 4), 126);
});

test("binomial: fuera de rango es cero, no una excepción", () => {
  assert.equal(binomial(5, -1), 0);
  assert.equal(binomial(5, 6), 0);
});

test("la fila entera suma 2^n", () => {
  // Si esto falla, la estimación de la línea de corte está sesgada.
  for (const n of [4, 5, 6, 7, 8, 9]) {
    let suma = 0;
    for (let k = 0; k <= n; k++) suma += binomial(n, k);
    assert.equal(suma, 2 ** n, `fila ${n}`);
  }
});

test("«al menos 0 victorias» son todos", () => {
  assert.equal(expectedWithAtLeast(32, 5, 0), 32);
});

test("32 personas y 5 rondas: 1 invicto, 6 con 4 o más", () => {
  assert.equal(expectedWithAtLeast(32, 5, 5), 1);
  assert.equal(expectedWithAtLeast(32, 5, 4), 6);
  assert.equal(expectedWithAtLeast(32, 5, 3), 16);
});

test("puntos: 3 por victoria y 1 por empate", () => {
  assert.equal(matchPoints(r(4, 1)), 12);
  assert.equal(matchPoints(r(3, 1, 1)), 10);
  assert.equal(matchPoints(r(0, 5)), 0);
});

test("el récord solo enseña los empates cuando los hay", () => {
  assert.equal(recordLabel(r(4, 1)), "4-1");
  assert.equal(recordLabel(r(3, 1, 1)), "3-1-1");
});

/* -------------------------------------------------------- línea de corte -- */

test("32 personas, 5 rondas, top 8: entra el 4-1 y el 3-2 es burbuja", () => {
  // Es el caso de manual y el que valida el modelo entero.
  const l = cutLine(32, 5, 8);
  assert.ok(l);
  assert.equal(l.safeWins, 4);
  assert.equal(l.bubbleWins, 3);
  assert.equal(l.expectedSafe, 6);
  assert.equal(l.expectedBubble, 16);
});

test("64 personas, 6 rondas, top 8: entra el 5-1", () => {
  const l = cutLine(64, 6, 8);
  assert.ok(l);
  assert.equal(l.safeWins, 5);
  assert.equal(l.bubbleWins, 4);
});

test("sin top cut no hay línea", () => {
  assert.equal(cutLine(32, 5, 0), null);
});

test("si el corte es más grande que el torneo, tampoco", () => {
  // Top 8 con 8 personas: entran todas, no hay nada que estimar.
  assert.equal(cutLine(8, 3, 8), null);
});

/* ------------------------------------------------------------ escenarios -- */

test("las rondas que quedan salen todas, empates incluidos", () => {
  // Con 2 rondas: 2-0, 1-1, 1-0-1, 0-2, 0-1-1, 0-0-2 → 6 repartos.
  const list = scenarios(r(2, 1), 2, null);
  assert.equal(list.length, 6);
  for (const s of list) {
    assert.equal(s.need.wins + s.need.losses + s.need.ties, 2);
    assert.equal(s.final.wins + s.final.losses + s.final.ties, 5);
  }
});

test("los escenarios vienen del mejor al peor", () => {
  const list = scenarios(r(2, 1), 2, null);
  for (let i = 1; i < list.length; i++) {
    assert.ok(list[i - 1].points >= list[i].points);
  }
});

test("un empate no vale lo mismo que una victoria", () => {
  const l = cutLine(32, 5, 8);
  // 4-1 son 12 puntos y entra; 3-1-1 son 10 y se queda en la burbuja.
  assert.equal(verdictFor(r(4, 1), l), "in");
  assert.equal(verdictFor(r(3, 1, 1), l), "bubble");
  assert.equal(verdictFor(r(2, 3), l), "out");
});

test("sin línea, ningún récord tiene veredicto", () => {
  assert.equal(verdictFor(r(5, 0), null), "unknown");
});

/* --------------------------------------------------------------- la foto -- */

test("2-1 en un 32 personas: con ganar 2 de 3 entra", () => {
  const o = cutOutlook({ players: 32, swissRounds: 5, topCut: 8, current: r(2, 1) });
  assert.equal(o.remaining, 2);
  assert.ok(o.cheapestIn);
  assert.equal(o.cheapestIn.need.wins, 2);
  assert.equal(o.eliminated, false);
  assert.equal(o.clinched, false);
});

test("4-0 con una ronda por jugar: ya está dentro pase lo que pase", () => {
  const o = cutOutlook({ players: 32, swissRounds: 5, topCut: 8, current: r(4, 0) });
  assert.equal(o.remaining, 1);
  assert.equal(o.clinched, true);
  assert.equal(o.eliminated, false);
});

test("0-3 con dos rondas: ni ganándolas todas", () => {
  const o = cutOutlook({ players: 32, swissRounds: 5, topCut: 8, current: r(0, 3) });
  assert.equal(o.remaining, 2);
  assert.equal(o.eliminated, true);
  assert.equal(o.cheapestIn, null);
});

test("con el suizo acabado no quedan rondas ni escenarios que ofrecer", () => {
  const o = cutOutlook({ players: 32, swissRounds: 5, topCut: 8, current: r(3, 2) });
  assert.equal(o.remaining, 0);
  assert.equal(o.scenarios.length, 1);
  assert.equal(o.scenarios[0].verdict, "bubble");
});

test("más rondas jugadas que las configuradas no da rondas negativas", () => {
  // Pasa de verdad: se apuntan las del top cut antes de arreglar el número
  // de rondas suizas del torneo.
  const o = cutOutlook({ players: 32, swissRounds: 5, topCut: 8, current: r(6, 1) });
  assert.equal(o.remaining, 0);
});

/* ------------------------------------------------------ orden de agenda -- */
/* Vive aquí y no en un fichero propio porque es una función de tres líneas;
   si crece, se muda. */

import { byAgenda } from "../src/lib/format.ts";

const ev = (date: string) => ({ date });

test("lo que viene por delante va primero, del más cercano al más lejano", () => {
  const hoy = "2026-09-21";
  const lista = [ev("2027-02-19"), ev("2026-09-26"), ev("2026-11-28")].sort(byAgenda(hoy));
  assert.deepEqual(lista.map((x) => x.date), ["2026-09-26", "2026-11-28", "2027-02-19"]);
});

test("lo ya jugado va detrás, del más reciente al más antiguo", () => {
  const hoy = "2026-09-21";
  const lista = [ev("2025-01-01"), ev("2026-09-01"), ev("2026-06-15")].sort(byAgenda(hoy));
  assert.deepEqual(lista.map((x) => x.date), ["2026-09-01", "2026-06-15", "2025-01-01"]);
});

test("lo de hoy es lo primero de todo", () => {
  const hoy = "2026-09-21";
  const lista = [ev("2026-09-20"), ev("2026-10-01"), ev("2026-09-21")].sort(byAgenda(hoy));
  assert.deepEqual(lista.map((x) => x.date), ["2026-09-21", "2026-10-01", "2026-09-20"]);
});

test("futuro y pasado mezclados: nunca se cuela un pasado por delante", () => {
  const hoy = "2026-09-21";
  const fechas = ["2026-09-25", "2026-08-01", "2027-05-08", "2024-12-31", "2026-09-21"];
  const lista = fechas.map(ev).sort(byAgenda(hoy));
  const corte = lista.findIndex((x) => x.date < hoy);
  assert.ok(lista.slice(0, corte).every((x) => x.date >= hoy));
  assert.ok(lista.slice(corte).every((x) => x.date < hoy));
});
