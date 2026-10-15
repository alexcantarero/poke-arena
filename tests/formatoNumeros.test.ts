import { test } from "node:test";
import assert from "node:assert/strict";
import { num, pct } from "../src/lib/format.ts";

test("pct: coma decimal, que es como se escribe en español", () => {
  assert.equal(pct(0.543), "54,3%");
  assert.equal(pct(0.5), "50,0%");
  assert.equal(pct(0.5, 0), "50%");
  assert.equal(pct(1), "100,0%");
});

test("pct: nulo, NaN o infinito es un guion, nunca «NaN%»", () => {
  assert.equal(pct(null), "—");
  assert.equal(pct(undefined), "—");
  assert.equal(pct(Number.NaN), "—");
  assert.equal(pct(Number.POSITIVE_INFINITY), "—");
});

test("pct: un cero es un cero, no un guion", () => {
  // Nulo y cero no son lo mismo (regla de la v0.10): un 0% es un dato.
  assert.equal(pct(0), "0,0%");
});

test("pct: sin espacio, para no desbordar las columnas de ancho fijo", () => {
  // `w-10`/`w-11` en las tablas de ranking: «100,0 %» no cabría.
  assert.ok(!pct(1).includes(" "));
  assert.ok(!pct(1).includes("\u202F"));
});

test("num: decimales con coma", () => {
  assert.equal(num(2.7, 1), "2,7");
  assert.equal(num(0.25, 2), "0,25");
});

test("num: los de cuatro cifras NO llevan punto de miles; a partir de 10.000, sí", () => {
  // Norma española. «5453 listas» es correcto; «5.453» no lo sería.
  assert.equal(num(5453), "5453");
  assert.equal(num(12840), "12.840");
});

test("num: nulo o no finito es un guion", () => {
  assert.equal(num(null), "—");
  assert.equal(num(Number.NaN), "—");
});
