import { test } from "node:test";
import assert from "node:assert/strict";
import {
  alternarTipo, ciudadesPresentes, parseCiudad, parseTipos, pasaCiudad, pasaTipos, tiposAParam,
} from "../src/lib/calendar.ts";

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

test("las ciudades disponibles solo salen de ubicaciones registradas", () => {
  assert.deepEqual(
    ciudadesPresentes([" Madrid ", "madrid", "Málaga", "", null, undefined, "  Santiago   de Chile "]),
    ["Madrid", "Málaga", "Santiago de Chile"],
  );
});

test("la ciudad de URL debe existir y se compara sin acentos ni diferencias de caja", () => {
  const disponibles = ciudadesPresentes(["Málaga", "Madrid"]);
  assert.equal(parseCiudad("malaga", disponibles), "Málaga");
  assert.equal(parseCiudad(["MADRID"], disponibles), "Madrid");
  assert.equal(parseCiudad("Barcelona", disponibles), "");
  assert.equal(pasaCiudad("Málaga", "malaga"), true);
  assert.equal(pasaCiudad("Málaga", "Madrid"), false);
  assert.equal(pasaCiudad("Málaga", null), false);
  assert.equal(pasaCiudad("", null), true);
});
