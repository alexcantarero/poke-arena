import { test } from "node:test";
import assert from "node:assert/strict";
import { alternarTipo, parseTipos, pasaTipos, tiposAParam } from "../src/lib/calendar.ts";

test("la URL antigua de un solo tipo se sigue leyendo", () => {
  assert.deepEqual(parseTipos("regional"), ["regional"]);
});

test("varios tipos, sin repetir, en el orden del calendario y sin los inventados", () => {
  assert.deepEqual(parseTipos("league_cup,regional,patata,regional"), ["regional", "league_cup"]);
  assert.deepEqual(parseTipos(["league_cup", "worlds"]), ["worlds", "league_cup"]);
  assert.deepEqual(parseTipos(undefined), []);
});

test("tocar un chip lo pone o lo quita", () => {
  const uno = alternarTipo([], "league_cup");
  assert.deepEqual(uno, ["league_cup"]);
  const dos = alternarTipo(uno, "regional");
  assert.equal(tiposAParam(dos), "regional,league_cup");
  assert.deepEqual(alternarTipo(dos, "league_cup"), ["regional"]);
  assert.deepEqual(alternarTipo([], "patata"), []);
});

test("sin tipos pasa todo; con tipos, solo esos", () => {
  assert.equal(pasaTipos([], null), true);
  assert.equal(pasaTipos(["regional"], "regional"), true);
  assert.equal(pasaTipos(["regional"], "league_cup"), false);
  assert.equal(pasaTipos(["regional"], null), false);
});
