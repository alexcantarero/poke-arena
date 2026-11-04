import { test } from "node:test";
import assert from "node:assert/strict";
import { ROTOM, ROTOM_DE, spriteRotom } from "../src/lib/rotom.ts";
import { LIMITES } from "../src/lib/usoLimites.ts";

test("cada límite del panel tiene su Rotom", () => {
  for (const k of Object.keys(LIMITES)) assert.ok(ROTOM_DE[k], k);
});

test("sprites de PokéAPI por id", () => {
  assert.equal(spriteRotom("lavado"), "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10009.png");
  assert.equal(new Set(Object.values(ROTOM)).size, 6);
});
