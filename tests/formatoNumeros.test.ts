import { test } from "node:test";
import assert from "node:assert/strict";
import { num, pct, wrColor } from "../src/lib/format.ts";

test("wrColor: cambia de tono en los ocho cortes de la escala", () => {
  const tonos = [0, 18, 36, 54, 72, 90, 108, 120];
  const porcentajes = [0, 15, 30, 45, 60, 75, 90, 100];
  for (const [indice, porcentaje] of porcentajes.entries()) {
    assert.equal(wrColor(porcentaje / 100), `hsl(${tonos[indice]} 82% var(--wr-color-lightness))`);
  }
});

test("wrColor: conserva el color dentro de cada tramo y limita los extremos", () => {
  assert.equal(wrColor(0.149), "hsl(0 82% var(--wr-color-lightness))");
  assert.equal(wrColor(0.999), "hsl(108 82% var(--wr-color-lightness))");
  assert.equal(wrColor(-1), "hsl(0 82% var(--wr-color-lightness))");
  assert.equal(wrColor(2), "hsl(120 82% var(--wr-color-lightness))");
  assert.equal(wrColor(null), "var(--muted)");
  assert.equal(wrColor(Number.NaN), "var(--muted)");
  assert.equal(wrColor(Number.POSITIVE_INFINITY), "var(--muted)");
});

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

/* ----------------------------------------------- v0.47: fecha corta ---- */

import { fechaCorta } from "../src/lib/format.ts";

test("fechaCorta: la única, en español", () => {
  assert.equal(fechaCorta("2026-10-18"), "18 oct");
  assert.equal(fechaCorta("2026-01-05"), "5 ene");
  // «sept» y no «sep»: la copia escrita a mano ponía «sep» y la de Inicio «sept».
  assert.equal(fechaCorta("2026-09-19"), "19 sept");
});

test("fechaCorta: acepta fecha con hora, y no la mueve de día", () => {
  assert.equal(fechaCorta("2026-10-18T23:30:00Z"), "18 oct");
});

test("fechaCorta: lo que no es una fecha se devuelve tal cual, nunca «Invalid Date»", () => {
  assert.equal(fechaCorta("vaya"), "vaya");
});
