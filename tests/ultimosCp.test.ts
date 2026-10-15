import { test } from "node:test";
import assert from "node:assert/strict";
import { fechaCorta, puestoTexto, ultimosConCp, type EntradaCp } from "../src/lib/ultimosCp.ts";

const e = (over: Partial<EntradaCp>): EntradaCp => ({
  id: "r1", torneoId: "t1", torneo: "Regional de Niza", fecha: "2026-10-18",
  tipo: "Regional", jugadorId: "p1", jugador: "Ibai", puesto: 15, cp: 60, ...over,
});

test("solo entran los resultados que puntuaron de verdad", () => {
  // Un cero puede ser un torneo que no da CP, un puesto fuera de tramo o una
  // asistencia sin rellenar. Las tres se leerían como «fue y no sacó nada».
  const r = ultimosConCp([e({ id: "a", cp: 0 }), e({ id: "b", cp: 50 })]);
  assert.deepEqual(r.map((x) => x.id), ["b"]);
});

test("del más reciente al más antiguo", () => {
  const r = ultimosConCp([
    e({ id: "a", fecha: "2026-09-01" }),
    e({ id: "b", fecha: "2026-10-18" }),
    e({ id: "c", fecha: "2026-10-01" }),
  ]);
  assert.deepEqual(r.map((x) => x.id), ["b", "c", "a"]);
});

test("a igual fecha manda quien más CP sacó", () => {
  const r = ultimosConCp([
    e({ id: "a", cp: 20, jugador: "Alex" }),
    e({ id: "b", cp: 200, jugador: "Ibai" }),
  ]);
  assert.deepEqual(r.map((x) => x.jugador), ["Ibai", "Alex"]);
});

test("el orden es estable: a igual fecha y CP, por id", () => {
  const uno = ultimosConCp([e({ id: "z" }), e({ id: "a" })]).map((x) => x.id);
  const dos = ultimosConCp([e({ id: "a" }), e({ id: "z" })]).map((x) => x.id);
  assert.deepEqual(uno, dos);
  assert.deepEqual(uno, ["a", "z"]);
});

test("se corta en cinco por defecto", () => {
  const muchos = Array.from({ length: 12 }, (_, i) =>
    e({ id: `r${i}`, fecha: `2026-10-${String(i + 1).padStart(2, "0")}` }));
  assert.equal(ultimosConCp(muchos).length, 5);
  assert.equal(ultimosConCp(muchos, 3).length, 3);
  assert.equal(ultimosConCp(muchos, 0).length, 0);
});

test("sin nada que enseñar devuelve lista vacía, no revienta", () => {
  assert.deepEqual(ultimosConCp([]), []);
  assert.deepEqual(ultimosConCp([e({ cp: 0 })]), []);
});

test("puestoTexto: nulo y cero no son un puesto", () => {
  assert.equal(puestoTexto(15), "15.º");
  assert.equal(puestoTexto(1), "1.º");
  // Se pueden meter CP a mano sin puesto; «0.º» sería inventárselo.
  assert.equal(puestoTexto(null), "—");
  assert.equal(puestoTexto(0), "—");
});

test("fechaCorta", () => {
  assert.equal(fechaCorta("2026-10-18"), "18 oct");
  assert.equal(fechaCorta("2026-01-05"), "5 ene");
  assert.equal(fechaCorta("vaya"), "vaya");
});

/* --------------------------------------------------------- v0.41: mayores */

import { asModoResultados, mayoresConCp } from "../src/lib/ultimosCp.ts";

test("mayoresConCp: del que más CP dio al que menos", () => {
  const r = mayoresConCp([
    e({ id: "a", cp: 20 }), e({ id: "b", cp: 200 }), e({ id: "c", cp: 60 }),
  ]);
  assert.deepEqual(r.map((x) => x.id), ["b", "c", "a"]);
});

test("mayoresConCp: los ceros no entran", () => {
  assert.deepEqual(mayoresConCp([e({ id: "a", cp: 0 }), e({ id: "b", cp: 15 })]).map((x) => x.id), ["b"]);
});

test("mayoresConCp: a igual CP, el más reciente arriba", () => {
  const r = mayoresConCp([
    e({ id: "viejo", cp: 50, fecha: "2026-06-01" }),
    e({ id: "nuevo", cp: 50, fecha: "2026-10-01" }),
  ]);
  assert.deepEqual(r.map((x) => x.id), ["nuevo", "viejo"]);
});

test("mayores y recientes dan listas distintas con los mismos datos", () => {
  // Es la razón de tener las dos: si dieran lo mismo, sobraría el selector.
  const datos = [
    e({ id: "grande-viejo", cp: 200, fecha: "2026-03-01" }),
    e({ id: "chico-nuevo", cp: 15, fecha: "2026-10-10" }),
  ];
  assert.equal(mayoresConCp(datos, 1)[0].id, "grande-viejo");
  assert.equal(ultimosConCp(datos, 1)[0].id, "chico-nuevo");
});

test("asModoResultados: por defecto «más CP»", () => {
  assert.equal(asModoResultados("recientes"), "recientes");
  assert.equal(asModoResultados("cp"), "cp");
  assert.equal(asModoResultados(undefined), "cp");
  assert.equal(asModoResultados("cualquier-cosa"), "cp");
});
