import { test } from "node:test";
import assert from "node:assert/strict";
import { agruparFilas, creaCiclo, raizDe } from "../src/lib/arquetipos.ts";

const padres = new Map<string, string | null>([
  ["slowking-drapion", "slowking"], ["slowking-kyurem", "slowking"], ["slowking", null],
  ["grookey-applin", "festival"], ["festival", null],
]);

test("la raíz de una variante es su arquetipo principal", () => {
  assert.equal(raizDe("slowking-drapion", padres), "slowking");
  assert.equal(raizDe("festival", padres), "festival");
  assert.equal(raizDe("suelto", padres), "suelto");
});

test("un ciclo no cuelga", () => {
  const m = new Map<string, string | null>([["a", "b"], ["b", "a"]]);
  assert.ok(["a", "b"].includes(raizDe("a", m)));
});

test("creaCiclo detecta padre = hijo y cadenas que vuelven", () => {
  assert.equal(creaCiclo("slowking", "slowking", padres), true);
  assert.equal(creaCiclo("slowking", "slowking-drapion", padres), true);
  assert.equal(creaCiclo("grookey-applin", "slowking", padres), false);
});

test("agrupar suma usos y recalcula el %V con los totales", () => {
  const f = (id: string, played: number, wins: number) =>
    ({ archetypeId: id, archetype: undefined, played, wins, ties: 0, losses: played - wins, gameWins: 0, gameLosses: 0, winRate: null });
  const g = agruparFilas([f("slowking-drapion", 1, 1), f("slowking-kyurem", 3, 0)], (id) => raizDe(id, padres), () => undefined);
  assert.equal(g.length, 1);
  assert.equal(g[0].archetypeId, "slowking");
  assert.equal(g[0].played, 4);
  assert.equal(g[0].winRate, 0.25); // y no (100% + 0%) / 2 = 50%
});

import { crearAgrupador, nombreFamilia } from "../src/lib/arquetipos.ts";

test("automático: todos los Dragapult van juntos, aunque no exista «Dragapult» a secas", () => {
  const g = crearAgrupador([
    { id: "a1", name: "Dragapult / Dudunsparce", main: "dragapult", secondary: "dudunsparce" },
    { id: "a2", name: "Dragapult / Blaziken", main: "dragapult", secondary: "blaziken" },
  ]);
  assert.equal(g.raiz("a1"), g.raiz("a2"));
  assert.equal(g.arquetipo(g.raiz("a1"))!.name, "Dragapult");
});

test("si existe el arquetipo base, la familia toma su nombre", () => {
  const g = crearAgrupador([
    { id: "base", name: "Dragapult ex", main: "dragapult", secondary: "" },
    { id: "a1", name: "Dragapult / Dudunsparce", main: "dragapult", secondary: "dudunsparce" },
  ]);
  assert.equal(g.raiz("a1"), "base");
});

test("el padre puesto a mano manda sobre el primer Pokémon", () => {
  const g = crearAgrupador([
    { id: "fl", name: "Festival Lead", main: "thwackey", secondary: "" },
    { id: "ga", name: "Grookey / Applin", main: "grookey", secondary: "applin", parentId: "fl" },
  ]);
  assert.equal(g.raiz("ga"), "fl");
});

test("nombres de familia legibles", () => {
  assert.equal(nombreFamilia("raging-bolt"), "Raging Bolt");
  assert.equal(nombreFamilia("excadrill-mega"), "Mega Excadrill");
});
