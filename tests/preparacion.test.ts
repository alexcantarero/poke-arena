import { test } from "node:test";
import assert from "node:assert/strict";
import { historialPropio, prepararTorneo, tonoDeCruce } from "../src/lib/preparacion.ts";

test("la lista: del más jugado al menos, con tu % y tu historial; el espejo va al 50", () => {
  const p = prepararTorneo({
    miLider: "dragapult",
    campo: { dragapult: 0.18, gardevoir: 0.14, "raging-bolt": 0.1, gholdengo: 0.06, rareza: 0.004 },
    probs: { gardevoir: { p: 0.42, n: 140 }, "raging-bolt": { p: 0.61, n: 90 }, gholdengo: { p: 0.3, n: 4 } },
    mio: { gardevoir: { w: 1, l: 3, t: 0 } },
    nombres: { gardevoir: "Gardevoir ex" },
  });
  assert.deepEqual(p.filas.map((f) => [f.lider, f.tono]), [
    ["dragapult", "espejo"], ["gardevoir", "desfavorable"], ["raging-bolt", "favorable"], ["gholdengo", "pocosDatos"],
  ]);
  assert.equal(p.filas[1].nombre, "Gardevoir ex");
  assert.deepEqual(p.filas[1].mio, { w: 1, l: 3, t: 0 });
  assert.equal(p.filas[0].p, 0.5);
  assert.ok(Math.abs(p.cubierto - 0.48) < 1e-9); // la rareza (<1 %) no sale
  // Esperado: media de tus % pesada por lo que se juega cada mazo.
  const esp = (0.18 * 0.5 + 0.14 * 0.42 + 0.1 * 0.61 + 0.06 * 0.3) / 0.48;
  assert.ok(Math.abs(p.esperado! - esp) < 1e-9);
  assert.deepEqual(p.cuidado.map((f) => f.lider), ["gardevoir"]); // gholdengo no: pocos datos
  assert.deepEqual(p.aFavor.map((f) => f.lider), ["raging-bolt"]);
});

test("«cuidado con» ordena por daño (cuota × lo que falta para el 50 %), no por el peor porcentaje", () => {
  const p = prepararTorneo({
    miLider: "x",
    campo: { a: 0.3, b: 0.03, c: 0.1 },
    probs: { a: { p: 0.44, n: 200 }, b: { p: 0.25, n: 50 }, c: { p: 0.4, n: 60 } },
  });
  // a: 0,30×0,06 = 0,018 · c: 0,10×0,10 = 0,010 · b: 0,03×0,25 = 0,0075
  assert.deepEqual(p.cuidado.map((f) => f.lider), ["a", "c", "b"]);
});

test("sin campo no hay esperado; y los tonos", () => {
  const p = prepararTorneo({ miLider: "x", campo: {}, probs: {} });
  assert.deepEqual([p.filas.length, p.esperado, p.cubierto], [0, null, 0]);
  assert.equal(tonoDeCruce(0.7, 5, false), "pocosDatos");
  assert.equal(tonoDeCruce(0.55, 12, false), "favorable");
  assert.equal(tonoDeCruce(0.5, 100, false), "parejo");
  assert.equal(tonoDeCruce(0.45, 100, false), "desfavorable");
  assert.equal(tonoDeCruce(0.9, 100, true), "espejo");
});

test("tu historial: solo las partidas con ESE mazo, contra cada rival", () => {
  const h = historialPropio([
    { mio: "dragapult", rival: "gardevoir", r: "w" }, { mio: "dragapult", rival: "gardevoir", r: "l" },
    { mio: "dragapult", rival: "gardevoir", r: "t" }, { mio: "charizard", rival: "gardevoir", r: "w" },
    { mio: "dragapult", rival: "", r: "w" },
  ], "dragapult");
  assert.deepEqual(h, { gardevoir: { w: 1, l: 1, t: 1 } });
  assert.deepEqual(historialPropio([{ mio: "a", rival: "b", r: "w" }], ""), {});
});
