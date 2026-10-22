import { test } from "node:test";
import assert from "node:assert/strict";
import { OBJETOS, urlDeObjeto } from "../src/lib/objetos.ts";

test("un uso se traduce a su objeto de PokéAPI", () => {
  assert.equal(urlDeObjeto("premios"), "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/amulet-coin.png");
  assert.equal(urlDeObjeto("rival"), urlDeObjeto(OBJETOS.rival));
});

test("un slug suelto pasa tal cual, y no deja colar rutas", () => {
  assert.match(urlDeObjeto("potion"), /items\/potion\.png$/);
  assert.match(urlDeObjeto("../../x"), /items\/x\.png$/);
});
