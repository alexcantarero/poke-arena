import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bestFinishes, byArchetype, byPlayer, convStats, hasCut, overTime,
  type PlacementRow,
} from "../src/lib/tournamentStats.ts";

const row = (over: Partial<PlacementRow> = {}): PlacementRow => ({
  playerId: "p1", archetypeId: "a1", placement: 5, date: "2026-09-01",
  kind: "league_cup", playerCount: 32, topCut: 8, ...over,
});

/* ------------------------------------------------------- lo fundamental -- */

test("sin resultados no hay tasas, y son null y no cero", () => {
  const s = convStats([]);
  assert.equal(s.entries, 0);
  assert.equal(s.cutRate, null);
  assert.equal(s.top4Rate, null);
  // «Todavía no hay dato» y «cero por ciento» no son lo mismo.
  assert.notEqual(s.cutRate, 0);
});

test("un resultado sin puesto no cuenta para nada", () => {
  const s = convStats([row({ placement: null }), row({ placement: 0 })]);
  assert.equal(s.entries, 0);
});

test("las cuatro cifras de un caso claro", () => {
  const s = convStats([
    row({ placement: 1 }),
    row({ placement: 4 }),
    row({ placement: 7 }),
    row({ placement: 20 }),
  ]);
  assert.equal(s.entries, 4);
  assert.equal(s.wins, 1);
  assert.equal(s.top4, 2);   // el 1.º y el 4.º
  assert.equal(s.top8, 3);   // y el 7.º
  assert.equal(s.cut, 3);    // top 8 configurado: entra quien queda 8.º o mejor
  assert.equal(s.winRate, 0.25);
  assert.equal(s.top4Rate, 0.5);
  assert.equal(s.top8Rate, 0.75);
  assert.equal(s.cutRate, 0.75);
});

/* --------------------------------------------- el denominador del corte -- */

test("un torneo sin corte no cuenta como corte fallado", () => {
  // Es el matiz que hace que el número signifique algo: un Challenge de 12
  // sin top cut no es un corte que se te haya escapado.
  const s = convStats([
    row({ placement: 1, topCut: 0 }),
    row({ placement: 9, topCut: 8 }),
  ]);
  assert.equal(s.entries, 2);
  assert.equal(s.cutEligible, 1);
  assert.equal(s.cut, 0);
  assert.equal(s.cutRate, 0);   // uno elegible, no convertido
  assert.equal(s.top8Rate, 0.5); // pero el 1.º sí es top 8
});

test("si ningún torneo tuvo corte, la conversión es null y no cero", () => {
  const s = convStats([row({ placement: 1, topCut: null }), row({ placement: 3, topCut: 0 })]);
  assert.equal(s.cutEligible, 0);
  assert.equal(s.cutRate, null);
});

test("el corte se compara contra el tamaño de ESE torneo", () => {
  const s = convStats([
    row({ placement: 5, topCut: 4 }),   // top 4: el 5.º se queda fuera
    row({ placement: 5, topCut: 8 }),   // top 8: el 5.º entra
  ]);
  assert.equal(s.cut, 1);
  assert.equal(s.cutRate, 0.5);
});

test("hasCut distingue null, cero y un corte de verdad", () => {
  assert.equal(hasCut({ topCut: null }), false);
  assert.equal(hasCut({ topCut: 0 }), false);
  assert.equal(hasCut({ topCut: 4 }), true);
});

/* ------------------------------------------------------------ agrupado -- */

test("por jugador", () => {
  const m = byPlayer([
    row({ playerId: "a", placement: 1 }),
    row({ playerId: "a", placement: 20 }),
    row({ playerId: "b", placement: 2 }),
  ]);
  assert.equal(m.get("a")?.entries, 2);
  assert.equal(m.get("a")?.wins, 1);
  assert.equal(m.get("b")?.top4Rate, 1);
});

test("por arquetipo, y los resultados sin mazo se quedan fuera", () => {
  const m = byArchetype([
    row({ archetypeId: "dragapult", placement: 1 }),
    row({ archetypeId: null, placement: 1 }),
  ]);
  assert.equal(m.size, 1);
  assert.equal(m.get("dragapult")?.entries, 1);
});

/* -------------------------------------------------------- en el tiempo -- */

test("agrupa por mes y en orden", () => {
  const t = overTime([
    row({ date: "2026-09-15", placement: 1 }),
    row({ date: "2026-08-02", placement: 9 }),
    row({ date: "2026-09-20", placement: 3 }),
  ]);
  assert.deepEqual(t.map((x) => x.key), ["2026-08", "2026-09"]);
  assert.equal(t[1].entries, 2);
  assert.equal(t[1].top4Rate, 1);
});

test("los meses sin nada no se rellenan con ceros", () => {
  // Rellenarlos dibujaría caídas que no han pasado.
  const t = overTime([row({ date: "2026-01-10" }), row({ date: "2026-06-10" })]);
  assert.equal(t.length, 2);
});

/* ----------------------------------------------------- mejores puestos -- */

test("los mejores resultados salen por puesto", () => {
  const b = bestFinishes([
    row({ placement: 12 }), row({ placement: 1 }), row({ placement: 5 }),
  ]);
  assert.deepEqual(b.map((r) => r.placement), [1, 5, 12]);
});

test("a igual puesto manda el torneo más grande", () => {
  // Un top 8 de 300 personas no es un top 8 de 20.
  const b = bestFinishes([
    row({ placement: 8, playerCount: 20, date: "2026-05-01" }),
    row({ placement: 8, playerCount: 300, date: "2026-04-01" }),
  ]);
  assert.equal(b[0].playerCount, 300);
});

test("los que no tienen puesto no son un resultado todavía", () => {
  const b = bestFinishes([row({ placement: null }), row({ placement: 3 })]);
  assert.equal(b.length, 1);
});

test("devuelve como mucho los que se le pidan", () => {
  const rows = [1, 2, 3, 4, 5, 6].map((p) => row({ placement: p }));
  assert.equal(bestFinishes(rows).length, 4);
  assert.equal(bestFinishes(rows, 2).length, 2);
});
