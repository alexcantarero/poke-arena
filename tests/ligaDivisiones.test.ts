import { test } from "node:test";
import assert from "node:assert/strict";
import {
  barajar, fechaJornada, partirEnDivisiones, sortearDivisiones, tamanosDivisiones, todosContraTodos,
} from "../src/lib/ligaDivisiones.ts";

const gente = (n: number) => Array.from({ length: n }, (_, i) => `p${String(i + 1).padStart(2, "0")}`);

test("tamaños: tope 6, lo más iguales posible, el sobrante arriba", () => {
  assert.deepEqual(tamanosDivisiones(6, 6), [6]);
  assert.deepEqual(tamanosDivisiones(7, 6), [4, 3]);
  assert.deepEqual(tamanosDivisiones(12, 6), [6, 6]);
  assert.deepEqual(tamanosDivisiones(14, 6), [5, 5, 4]);
  assert.deepEqual(tamanosDivisiones(3, 6), [3]);
  assert.deepEqual(tamanosDivisiones(0, 6), []);
  assert.deepEqual(tamanosDivisiones(10, 8), [5, 5]);
});

test("el sorteo es reproducible con la misma semilla y cambia con otra", () => {
  const a = sortearDivisiones(gente(14), 6, "semilla-1");
  const b = sortearDivisiones(gente(14), 6, "semilla-1");
  const c = sortearDivisiones(gente(14), 6, "semilla-2");
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  // No depende del orden en que llegan.
  assert.deepEqual(sortearDivisiones([...gente(14)].reverse(), 6, "semilla-1"), a);
  // Están todos, una sola vez.
  assert.deepEqual(a.flat().sort(), gente(14));
  assert.deepEqual(a.map((d) => d.length), [5, 5, 4]);
});

test("barajar no toca la lista original", () => {
  const l = gente(5);
  barajar(l, "x");
  assert.deepEqual(l, gente(5));
  assert.deepEqual(partirEnDivisiones(["a", "b", "c"], 2), [["a", "b"], ["c"]]);
});

test("todos contra todos con número par: n−1 jornadas, cada cruce una vez", () => {
  const j = todosContraTodos(gente(6));
  assert.equal(j.length, 5);
  const vistos = new Set<string>();
  for (const { cruces, descansa } of j) {
    assert.equal(descansa, null);
    assert.equal(cruces.length, 3);
    const en = cruces.flat();
    assert.equal(new Set(en).size, 6); // nadie juega dos veces la misma jornada
    for (const [a, b] of cruces) vistos.add([a, b].sort().join("-"));
  }
  assert.equal(vistos.size, 15); // 6·5/2
});

test("todos contra todos con número impar: cada uno descansa una vez", () => {
  const j = todosContraTodos(gente(5));
  assert.equal(j.length, 5);
  const descansos = j.map((x) => x.descansa);
  assert.equal(new Set(descansos).size, 5);
  const vistos = new Set(j.flatMap((x) => x.cruces.map(([a, b]) => [a, b].sort().join("-"))));
  assert.equal(vistos.size, 10);
  assert.deepEqual(todosContraTodos(["solo"]), []);
});

test("una jornada por semana desde el inicio", () => {
  assert.equal(fechaJornada("2026-11-16", 1), "2026-11-16");
  assert.equal(fechaJornada("2026-11-16", 3), "2026-11-30");
  assert.equal(fechaJornada("2026-12-28", 2), "2027-01-04");
});

import { clasificarDivision, movimientos, siguienteReparto, type PartidaDivision } from "../src/lib/ligaDivisiones.ts";

const serie = (a: string, b: string, ga: number, gb: number): PartidaDivision =>
  ({ a, b, ga, gb, ganador: ga > gb ? "a" : gb > ga ? "b" : "tie" });

test("clasificación: puntos de serie primero", () => {
  const c = clasificarDivision(["a", "b", "c"], [serie("a", "b", 2, 0), serie("a", "c", 2, 1), serie("b", "c", 2, 1)]);
  assert.deepEqual(c.map((x) => x.id), ["a", "b", "c"]);
  assert.equal(c[0].puntos, 6);
  assert.equal(c[0].juegosFavor, 4);
});

test("desempate: enfrentamiento directo solo entre DOS empatados", () => {
  // a y b empatan a 3; b le ganó a a (aunque a tiene mejor diferencia de juegos).
  const c = clasificarDivision(["a", "b", "c"], [serie("b", "a", 2, 1), serie("a", "c", 2, 0), serie("c", "b", 2, 1)]);
  // Aquí los TRES empatan a 3 puntos: no se mira el directo, manda la diferencia de juegos.
  assert.deepEqual(c.map((x) => x.puntos), [3, 3, 3]);
  assert.equal(c[0].id, "a"); // a: +1 de juegos (3-2)
  const dos = clasificarDivision(["a", "b", "c", "d"], [
    serie("b", "a", 2, 1), serie("a", "c", 2, 0), serie("a", "d", 2, 0), serie("b", "c", 0, 2), serie("b", "d", 2, 0),
  ]);
  // a y b con 6: b ganó el directo aunque a tiene mejor diferencia.
  assert.deepEqual(dos.slice(0, 2).map((x) => x.id), ["b", "a"]);
});

test("partidas sin resultado no cuentan", () => {
  const c = clasificarDivision(["a", "b"], [{ a: "a", b: "b", ga: 0, gb: 0, ganador: null }]);
  assert.equal(c[0].jugadas, 0);
  assert.equal(c[0].owp, null);
});

test("movimientos: suben 2 y bajan 2, sin subir de la 1.ª ni bajar de la última", () => {
  const m = movimientos([["a1", "a2", "a3", "a4", "a5"], ["b1", "b2", "b3", "b4", "b5"], ["c1", "c2", "c3", "c4"]]);
  assert.deepEqual(m[0], { sube: [], baja: ["a4", "a5"] });
  assert.deepEqual(m[1], { sube: ["b1", "b2"], baja: ["b4", "b5"] });
  assert.deepEqual(m[2], { sube: ["c1", "c2"], baja: [] });
  // Una división de 3: como mucho 1, para que nadie suba y baje a la vez.
  assert.deepEqual(movimientos([["x"], ["y1", "y2", "y3"], ["z1", "z2"]])[1], { sube: ["y1"], baja: ["y3"] });
});

test("siguiente temporada: se aplican los movimientos y los nuevos entran abajo", () => {
  const ordenes = [["a1", "a2", "a3", "a4", "a5"], ["b1", "b2", "b3", "b4", "b5"], ["c1", "c2", "c3", "c4"]];
  const todos = ordenes.flat();
  const r = siguienteReparto(ordenes, todos, 6);
  assert.deepEqual(r.map((d) => [...d].sort()), [
    ["a1", "a2", "a3", "b1", "b2"].sort(),
    ["a4", "a5", "b3", "c1", "c2"].sort(),
    ["b4", "b5", "c3", "c4"].sort(),
  ]);
  // Uno se va y entra uno nuevo: el nuevo, en la última.
  const r2 = siguienteReparto(ordenes, [...todos.filter((x) => x !== "a1"), "nuevo"], 6);
  assert.ok(r2[r2.length - 1].includes("nuevo"));
  assert.ok(!r2.flat().includes("a1"));
  assert.equal(r2.flat().length, 14);
});
