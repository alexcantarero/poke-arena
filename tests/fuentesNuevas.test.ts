import { test } from "node:test";
import assert from "node:assert/strict";
import { crucesDeMatchupProfiles } from "../src/lib/ciphermaniacCruces.ts";
import { parseConversionTH } from "../src/lib/trainerHill.ts";

const lider = (s: string) => s.toLowerCase().split(/[\s_-]+/)[0];

test("Ciphermaniac: objeto por arquetipo, sin duplicar la pareja", () => {
  const c = crucesDeMatchupProfiles({
    "Dragapult Dusknoir": { matchups: { "Gardevoir": { wins: 6, losses: 4, ties: 1 } } },
    "Gardevoir": { matchups: { "Dragapult Dusknoir": { wins: 4, losses: 6, ties: 1 } } },
  }, lider);
  assert.equal(c.length, 1);
  assert.deepEqual(c[0], { a: "dragapult", b: "gardevoir", w: 6, l: 4, t: 1 });
});

test("Ciphermaniac: lista de filas y basura descartada", () => {
  const c = crucesDeMatchupProfiles([
    { archetype: "Zoroark", opponent: "Dragapult", wins: 3, losses: 5, ties: 0 },
    { archetype: "Zoroark", opponent: "Zoroark", wins: 2, losses: 2 },
    { nada: 1 },
  ], lider);
  assert.deepEqual(c, [{ a: "dragapult", b: "zoroark", w: 5, l: 3, t: 0 }]);
  assert.deepEqual(crucesDeMatchupProfiles("no", lider), []);
});

test("Trainer Hill conversión: columnas por nombre, en cualquier orden", () => {
  const r = parseConversionTH("players,deck,day 2,top cut\n100,dragapult-dusknoir,40,4\n20,crustle,25,1");
  assert.equal(r.filas.length, 2);
  assert.deepEqual(r.filas[0], { deck: "dragapult-dusknoir", lider: "dragapult", n: 100, dia2: 40, corte: 4 });
  assert.equal(r.filas[1].dia2, 20); // nunca más que el total
  assert.ok(parseConversionTH("deck,wins\nx,1").errores.length > 0);
});
