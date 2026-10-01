import { test } from "node:test";
import assert from "node:assert/strict";
import { primerTurno, textoLado } from "../src/lib/primerTurno.ts";

test("EL FALLO QUE ESTO CORRIGE: empezar 1 y ganarla no es un 33%", () => {
  const r = primerTurno([
    { firstGameOne: true, result: "w" },
    { firstGameOne: false, result: "w" },
    { firstGameOne: false, result: "w" },
  ]);
  assert.deepEqual(r.primero, { jugadas: 1, ganadas: 1, tasa: 1 });
  assert.deepEqual(r.segundo, { jugadas: 2, ganadas: 2, tasa: 1 });
  assert.equal(r.total, 3);
});

test("empates, rondas abiertas y turno sin apuntar no cuentan", () => {
  const r = primerTurno([
    { firstGameOne: true, result: "d" },
    { firstGameOne: true, result: null },
    { firstGameOne: null, result: "w" },
    { firstGameOne: true, result: "l" },
  ]);
  assert.equal(r.total, 1);
  assert.equal(r.primero.ganadas, 0);
  assert.equal(r.segundo.tasa, null);
});

test("el texto lleva el denominador", () => {
  assert.equal(textoLado({ jugadas: 3, ganadas: 1, tasa: 1 / 3 }), "1 de 3 (33%)");
  assert.equal(textoLado({ jugadas: 0, ganadas: 0, tasa: null }), "—");
});
