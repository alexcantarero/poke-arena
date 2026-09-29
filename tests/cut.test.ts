import { test } from "node:test";
import assert from "node:assert/strict";
import {
  binomial, collapseOut, cutLine, cutOutlook, expectedWithAtLeast, matchPoints,
  recordLabel, scenarios, verdictFor, type Record3,
  regionalStructure, qualifiesForDay2, isRegionalTournament, day1Outlook,
  day1Scenarios, filterDay2Qualifiers,
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

/* `assert.ok(x)` estrecha el tipo en tiempo de ejecución pero depende de que
   TypeScript vea la firma `asserts value` de @types/node. En vez de fiarlo a
   eso —que es lo que hace que un test compile en un sitio y no en otro—, se
   comprueba y se saca a una constante ya no nula. */
function noNulo<T>(v: T | null | undefined, que: string): T {
  assert.ok(v, `esperaba ${que}, y no hay`);
  return v as T;
}

test("32 personas, 5 rondas, top 8: entra el 4-1 y el 3-2 es burbuja", () => {
  // Es el caso de manual y el que valida el modelo entero.
  const l = noNulo(cutLine(32, 5, 8), "una línea de corte");
  assert.equal(l.safeWins, 4);
  assert.equal(l.bubbleWins, 3);
  assert.equal(l.expectedSafe, 6);
  assert.equal(l.expectedBubble, 16);
});

test("64 personas, 6 rondas, top 8: entra el 5-1", () => {
  const l = noNulo(cutLine(64, 6, 8), "una línea de corte");
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
  const barato = noNulo(o.cheapestIn, "un escenario que entre");
  assert.equal(barato.need.wins, 2);
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

/* ------------------------------------------------- resumir los perdidos -- */

test("de todos los escenarios perdidos se enseña solo el mejor", () => {
  const l = cutLine(32, 5, 8);
  const list = scenarios(r(0, 3), 2, l);
  const { shown, hiddenOut } = collapseOut(list);
  const fuera = shown.filter((s) => s.verdict === "out");
  assert.equal(fuera.length, 1);
  assert.equal(hiddenOut, list.filter((s) => s.verdict === "out").length - 1);
  // Y el que queda es el que más puntos saca de los perdidos.
  const maxFuera = Math.max(...list.filter((s) => s.verdict === "out").map((s) => s.points));
  assert.equal(fuera[0].points, maxFuera);
});

test("lo que entra y lo que depende se enseña entero", () => {
  const l = cutLine(32, 5, 8);
  const list = scenarios(r(2, 1), 2, l);
  const { shown } = collapseOut(list);
  for (const v of ["in", "bubble"] as const) {
    assert.equal(
      shown.filter((s) => s.verdict === v).length,
      list.filter((s) => s.verdict === v).length,
      v,
    );
  }
});

test("con un solo perdido no se resume nada", () => {
  const l = cutLine(32, 5, 8);
  const list = scenarios(r(4, 0), 1, l);
  const { shown, hiddenOut } = collapseOut(list);
  assert.equal(hiddenOut, 0);
  assert.equal(shown.length, list.length);
});

/* ---------------------------------- lógica regional: día 1, día 2 y top cut -- */

test("regionalStructure: estructura oficial de dos fases según Play! Pokémon Handbook (Variant #5)", () => {
  // 65–128: 7 Día 1 + 2 Día 2 = 9 suizas, umbral 13 pts
  const s100 = regionalStructure(100);
  assert.equal(s100.day1Rounds, 7);
  assert.equal(s100.day2Rounds, 2);
  assert.equal(s100.totalSwissRounds, 9);
  assert.equal(s100.pointsThreshold, 13);
  assert.equal(s100.hasDay2, true);

  // 129–256: 8 Día 1 + 2 Día 2 = 10 suizas, umbral 16 pts
  const s200 = regionalStructure(200);
  assert.equal(s200.day1Rounds, 8);
  assert.equal(s200.day2Rounds, 2);
  assert.equal(s200.totalSwissRounds, 10);
  assert.equal(s200.pointsThreshold, 16);

  // 257–512: 8 Día 1 + 3 Día 2 = 11 suizas, umbral 16 pts
  const s400 = regionalStructure(400);
  assert.equal(s400.day1Rounds, 8);
  assert.equal(s400.day2Rounds, 3);
  assert.equal(s400.totalSwissRounds, 11);
  assert.equal(s400.pointsThreshold, 16);

  // 513–1,024: 8 Día 1 + 4 Día 2 = 12 suizas, umbral 16 pts
  const s800 = regionalStructure(800);
  assert.equal(s800.day1Rounds, 8);
  assert.equal(s800.day2Rounds, 4);
  assert.equal(s800.totalSwissRounds, 12);
  assert.equal(s800.pointsThreshold, 16);

  // 1,025–2,048: 8 Día 1 + 5 Día 2 = 13 suizas, umbral 16 pts
  const s1500 = regionalStructure(1500);
  assert.equal(s1500.day1Rounds, 8);
  assert.equal(s1500.day2Rounds, 5);
  assert.equal(s1500.totalSwissRounds, 13);
  assert.equal(s1500.pointsThreshold, 16);

  // 2,049–4,096: 8 Día 1 + 6 Día 2 = 14 suizas, umbral 16 pts
  const s2500 = regionalStructure(2500);
  assert.equal(s2500.day1Rounds, 8);
  assert.equal(s2500.day2Rounds, 6);
  assert.equal(s2500.totalSwissRounds, 14);
  assert.equal(s2500.pointsThreshold, 16);

  // 4,097–8,192: 9 Día 1 + 6 Día 2 = 15 suizas, umbral 19 pts
  const s5000 = regionalStructure(5000);
  assert.equal(s5000.day1Rounds, 9);
  assert.equal(s5000.day2Rounds, 6);
  assert.equal(s5000.totalSwissRounds, 15);
  assert.equal(s5000.pointsThreshold, 19);

  // Top Cut siempre es 8 para >= 65 y la garantía de Día 2 es 32
  for (const s of [s100, s200, s400, s800, s1500, s2500, s5000]) {
    assert.equal(s.topCut, 8);
    assert.equal(s.minDay2Players, 32);
    assert.equal(s.topCutRounds, 3);
  }
});

test("qualifiesForDay2: estándar (129 a 4096) clasifica con 16 puntos", () => {
  // 5-2-1 = 16 pts en 1000 participantes
  const q1 = qualifiesForDay2({ participants: 1000, record: r(5, 2, 1) });
  assert.equal(q1.qualifies, true);
  assert.equal(q1.byPoints, true);
  assert.equal(q1.byTop32, false);
  assert.equal(q1.points, 16);
  assert.equal(q1.threshold, 16);

  // 6-2-0 = 18 pts en 2500 participantes (sigue siendo umbral 16 pts según handbook)
  const q2 = qualifiesForDay2({ participants: 2500, record: r(6, 2, 0) });
  assert.equal(q2.qualifies, true);
  assert.equal(q2.byPoints, true);
  assert.equal(q2.threshold, 16);
});

test("qualifiesForDay2: 65 a 128 participantes pide 13 puntos", () => {
  // 4-2-1 = 13 pts en 100 participantes
  const q1 = qualifiesForDay2({ participants: 100, record: r(4, 2, 1) });
  assert.equal(q1.qualifies, true);
  assert.equal(q1.byPoints, true);
  assert.equal(q1.threshold, 13);

  // 4-3-0 = 12 pts (< 13) no llega
  const q2 = qualifiesForDay2({ participants: 100, record: r(4, 3, 0) });
  assert.equal(q2.qualifies, false);
});

test("qualifiesForDay2: más de 4096 participantes pide 19 puntos", () => {
  // 6-2-1 = 19 pts en 5000 participantes
  const q1 = qualifiesForDay2({ participants: 5000, record: r(6, 2, 1) });
  assert.equal(q1.qualifies, true);
  assert.equal(q1.byPoints, true);
  assert.equal(q1.threshold, 19);

  // 5-1-3 = 18 pts: no llega por puntos
  const q2 = qualifiesForDay2({ participants: 5000, record: r(5, 1, 3) });
  assert.equal(q2.qualifies, false);

  // Mismo 18 pts pero en puesto 30: entra por garantía Top 32
  const q3 = qualifiesForDay2({ participants: 5000, record: r(5, 1, 3), placement: 30 });
  assert.equal(q3.qualifies, true);
  assert.equal(q3.byTop32, true);
});

test("day1Outlook: cálculo de rondas restantes y camino más barato", () => {
  // 4-1-0 (12 pts) en torneo estándar tras ronda 5: quedan 3 rondas
  const d1 = day1Outlook({ players: 1200, current: r(4, 1, 0) });
  assert.equal(d1.day1Rounds, 8);
  assert.equal(d1.remaining, 3);
  assert.equal(d1.threshold, 16);
  assert.equal(d1.clinched, false);
  assert.equal(d1.eliminated, false);
  // El más barato para llegar a 16 desde 12 es 1V 1E (4 pts -> 16)
  assert.equal(d1.cheapestIn?.need.wins, 1);
  assert.equal(d1.cheapestIn?.need.ties, 1);
});

test("day1Outlook: clinched cuando ya supera el umbral", () => {
  // 6-0-0 (18 pts) tras ronda 6: ya tiene >= 16 pts
  const d1 = day1Outlook({ players: 1000, current: r(6, 0, 0) });
  assert.equal(d1.clinched, true);
  assert.equal(d1.eliminated, false);
  assert.equal(d1.cheapestIn?.need.wins, 0);
  assert.equal(d1.cheapestIn?.need.ties, 0);
});

test("day1Outlook: eliminated cuando ya no da matemáticamente", () => {
  // 1-5-0 (3 pts) tras ronda 6: quedan 2 rondas (max 3 + 6 = 9 < 16)
  const d1 = day1Outlook({ players: 1000, current: r(1, 5, 0) });
  assert.equal(d1.eliminated, true);
  assert.equal(d1.cheapestIn, null);
});

test("filterDay2Qualifiers: filtra correctamente por puntos y por Top 32", () => {
  const standings = [
    { placement: 1, wins: 8, losses: 0, ties: 0 }, // 24 pts -> pasa por puntos
    { placement: 20, wins: 5, losses: 2, ties: 1 }, // 16 pts -> pasa por puntos
    { placement: 30, wins: 5, losses: 3, ties: 0 }, // 15 pts -> pasa por Top 32
    { placement: 32, wins: 4, losses: 2, ties: 2 }, // 14 pts -> pasa por Top 32
    { placement: 33, wins: 4, losses: 2, ties: 2 }, // 14 pts -> fuera
    { placement: 50, wins: 5, losses: 2, ties: 1 }, // 16 pts -> pasa por puntos
    { placement: 60, wins: 5, losses: 3, ties: 0 }, // 15 pts -> fuera
  ];

  const qualifiers = filterDay2Qualifiers(standings, 1000);
  const placements = qualifiers.map((q) => q.placement);
  assert.deepEqual(placements, [1, 20, 30, 32, 50]);
});

test("isRegionalTournament: con tipo manda el tipo; sin él, asistencia >= 65", () => {
  assert.equal(isRegionalTournament("regional", 100), true);
  assert.equal(isRegionalTournament("special", 50), true);
  assert.equal(isRegionalTournament("international", 200), true);
  assert.equal(isRegionalTournament("store", 300), false); // v0.13: solo el tipo decide
  assert.equal(isRegionalTournament("pokemon_cup", 300), false);
  assert.equal(isRegionalTournament("league_challenge", 300), false);
  assert.equal(isRegionalTournament("league_cup", 64), false);
  assert.equal(isRegionalTournament(undefined, 65), true);
  assert.equal(isRegionalTournament(undefined, 64), false);
});
