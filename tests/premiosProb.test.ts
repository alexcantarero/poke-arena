import { test } from "node:test";
import assert from "node:assert/strict";
import { desconocidasDe, probPremios } from "../src/lib/premiosProb.ts";

const cerca = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

test("al empezar (60 sin ver, 6 premios): una carta de 1 copia está en premios el 10 % de las veces", () => {
  const r = probPremios(1, 0, 60, 6);
  cerca(r.alguna, 0.1);
  cerca(r.todas, 0.1);
  cerca(r.esperadas, 0.1);
});

test("de 4 copias, alguna en premios ≈ 35,1 %; las 4 a la vez, casi nunca", () => {
  const r = probPremios(4, 0, 60, 6);
  // 1 − C(56,6)/C(60,6)
  cerca(r.alguna, 1 - (56 * 55 * 54 * 53 * 52 * 51) / (60 * 59 * 58 * 57 * 56 * 55));
  cerca(r.todas, (6 * 5 * 4 * 3) / (60 * 59 * 58 * 57));
  cerca(r.esperadas, 0.4);
});

test("lo visto no puede estar en premios; a mitad de partida cambia la cuenta", () => {
  assert.deepEqual(probPremios(2, 2, 40, 6), { alguna: 0, todas: 0, esperadas: 0, sinVer: 0 });
  // Quedan 20 sin ver y 4 premios boca abajo; de la carta quedan 2 sin ver.
  const r = probPremios(3, 1, 20, 4);
  cerca(r.alguna, 1 - (18 * 17 * 16 * 15) / (20 * 19 * 18 * 17)); // 1 − C(18,4)/C(20,4)
  assert.equal(r.sinVer, 2);
  // Si todo lo que no has visto son premios, está ahí seguro.
  cerca(probPremios(1, 0, 6, 6).alguna, 1);
  assert.equal(probPremios(4, 0, 60, 0).alguna, 0);
});

test("cartas sin ver = mazo − vistas", () => {
  assert.equal(desconocidasDe(60, 14), 46);
  assert.equal(desconocidasDe(60, 80), 0);
});
