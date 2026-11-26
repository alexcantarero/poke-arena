import { test } from "node:test";
import assert from "node:assert/strict";
import { aciertos, barajar, expandir, faltan, repartir } from "../src/lib/simPremios.ts";

// Un azar fijo y reproducible (LCG).
const semilla = (s: number) => () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);

const lista = {
  pokemon: [{ n: 4, name: "Slowking" }, { n: 2, name: "Kyurem" }],
  trainer: [{ n: 4, name: "Ultra Ball" }, { n: 4, name: "Boss's Orders" }, { n: 30, name: "Relleno" }],
  energy: [{ n: 16, name: "Psychic Energy" }],
};

test("la lista se expande a 60 cartas y el reparto es 7 + 6 + 47", () => {
  const c = expandir(lista);
  assert.equal(c.length, 60);
  const r = repartir(c, semilla(7));
  assert.deepEqual([r.mano.length, r.premios.length, r.mazo.length], [7, 6, 47]);
  assert.ok(r.mano.some((x) => x.pokemon)); // sin Pokémon en mano habría mulligan
  // Mano + premios + mazo es la lista entera.
  assert.equal(faltan(c, [...r.mano, ...r.premios, ...r.mazo]).size, 0);
});

test("lo que falta en mano + mazo es exactamente lo que hay en premios", () => {
  const c = expandir(lista);
  const r = repartir(c, semilla(42));
  const f = faltan(c, [...r.mano, ...r.mazo]);
  assert.equal([...f.values()].reduce((a, b) => a + b, 0), 6);
  for (const p of r.premios) assert.ok((f.get(p.name) ?? 0) > 0);
});

test("aciertos como multiconjunto", () => {
  const p = [{ name: "Boss's Orders", pokemon: false }, { name: "Kyurem", pokemon: true }, { name: "Relleno", pokemon: false }];
  assert.equal(aciertos(["Boss's Orders", "Boss's Orders", "Kyurem"], p), 2);
  assert.equal(aciertos([], p), 0);
});

test("barajar no pierde ni inventa cartas", () => {
  const xs = [1, 2, 3, 4, 5, 6];
  assert.deepEqual([...barajar(xs, semilla(1))].sort(), xs);
  assert.deepEqual(expandir(null), []);
});
