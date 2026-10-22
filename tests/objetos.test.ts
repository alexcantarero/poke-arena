import { test } from "node:test";
import assert from "node:assert/strict";
import { BALL_DE_FAMILIA, OBJETOS, leerRef, urlDeObjeto } from "../src/lib/objetos.ts";

test("un uso se traduce a su objeto de PokéAPI", () => {
  assert.equal(urlDeObjeto("premios"), "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/amulet-coin.png");
  assert.equal(urlDeObjeto("rival"), urlDeObjeto(OBJETOS.rival));
});

test("un slug suelto pasa tal cual, y no deja colar rutas", () => {
  assert.match(urlDeObjeto("potion"), /items\/potion\.png$/);
  assert.match(urlDeObjeto("../../x"), /items\/x\.png$/);
});

test("una referencia de sprite es objeto o Pokémon, y nada más", () => {
  assert.deepEqual(leerRef("objeto:town-map"), { tipo: "objeto", slug: "town-map" });
  assert.deepEqual(leerRef("pokemon:chansey"), { tipo: "pokemon", slug: "chansey" });
  assert.equal(leerRef("🏥"), null);
  assert.equal(leerRef("objeto:../x"), null);
});

test("cada familia de torneo tiene su Ball, mejor cuanto más grande", () => {
  assert.equal(BALL_DE_FAMILIA.challenge, "poke-ball");
  assert.equal(BALL_DE_FAMILIA.major, "ultra-ball");
});
