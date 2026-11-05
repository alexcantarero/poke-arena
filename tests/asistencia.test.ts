import { test } from "node:test";
import assert from "node:assert/strict";
import { alternarEstado, claveAsistencia, contarAsistencia, esEstado, parseFiltroAsistencia, pasaAsistencia } from "../src/lib/asistencia.ts";

test("el filtro por defecto es «todo», y uno desconocido también", () => {
  assert.equal(parseFiltroAsistencia(undefined), "todo");
  assert.equal(parseFiltroAsistencia("loquesea"), "todo");
  assert.equal(parseFiltroAsistencia("sin-no"), "sin-no");
});

test("«sin los que no voy» enseña lo que iré, lo que quizá y lo que no he mirado", () => {
  assert.equal(pasaAsistencia("sin-no", "si"), true);
  assert.equal(pasaAsistencia("sin-no", "quiza"), true);
  assert.equal(pasaAsistencia("sin-no", null), true);
  assert.equal(pasaAsistencia("sin-no", "no"), false);
});

test("«mis planes» es iré + quizá; «iré» y «no iré» son exactos; «todo» enseña todo", () => {
  assert.deepEqual(["si", "quiza", "no", null].map((e) => pasaAsistencia("mios", e as never)), [true, true, false, false]);
  assert.deepEqual(["si", "quiza", "no", null].map((e) => pasaAsistencia("si", e as never)), [true, false, false, false]);
  assert.deepEqual(["si", "quiza", "no", null].map((e) => pasaAsistencia("no", e as never)), [false, false, true, false]);
  assert.deepEqual(["si", "quiza", "no", null].map((e) => pasaAsistencia("todo", e as never)), [true, true, true, true]);
});

test("pulsar el mismo estado lo desmarca; otro estado lo cambia", () => {
  assert.equal(alternarEstado("si", "si"), null);
  assert.equal(alternarEstado("quiza", "si"), "si");
  assert.equal(alternarEstado(null, "no"), "no");
});

test("recuento sin repetir ids, y los estados válidos", () => {
  const m = new Map([["evento:a", "si"], ["torneo:b", "no"]] as const);
  assert.deepEqual(contarAsistencia(["evento:a", "evento:a", "torneo:b", "evento:c"], m), { si: 1, quiza: 0, no: 1, sinMarcar: 1 });
  assert.equal(esEstado("quiza"), true);
  assert.equal(esEstado("tal vez"), false);
  assert.equal(claveAsistencia("torneo", "t1"), "torneo:t1");
});
