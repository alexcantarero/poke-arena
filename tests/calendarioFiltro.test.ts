import { test } from "node:test";
import assert from "node:assert/strict";
import {
  alternarTipo, ciudadesPresentes, ciudadDeUbicacion, parseCiudad, parseTipos, pasaCiudad, pasaTipos, tiposAParam,
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

test("extrae ciudades de direcciones con códigos postales, regiones y países", () => {
  assert.equal(ciudadDeUbicacion("122 CARRER NOU, FIGUERES, CT 17600, ES"), "FIGUERES");
  assert.equal(ciudadDeUbicacion("16 PG. DE ST. JOAN, BARCELONA, CT 08010, ES"), "BARCELONA");
  assert.equal(ciudadDeUbicacion("21 AV. EDOUARD VII, 64200 BIARRITZ, FRANCE"), "BIARRITZ");
  assert.equal(
    ciudadDeUbicacion("AV. DE FERNANDO ARCE, 4, 39300 TORRELAVEGA, CANTABRIA, SPAIN"),
    "TORRELAVEGA",
  );
  assert.equal(ciudadDeUbicacion("Bologna, Italia"), "Bologna");
});

test("el filtro agrupa direcciones por la ciudad extraída", () => {
  const ciudades = ciudadesPresentes([
    "122 CARRER NOU, FIGUERES, CT 17600, ES",
    "FIGUERES",
    "21 AV. EDOUARD VII, 64200 BIARRITZ, FRANCE",
  ]);
  assert.deepEqual(ciudades, ["BIARRITZ", "FIGUERES"]);
  assert.equal(pasaCiudad("Figueres", "122 CARRER NOU, FIGUERES, CT 17600, ES"), true);
  assert.equal(pasaCiudad("Barcelona", "122 CARRER NOU, FIGUERES, CT 17600, ES"), false);
});

test("el filtro libre de ciudad conserva el texto escrito y los espacios", () => {
  assert.equal(parseCiudad("  Barcelona  "), "Barcelona");
  assert.equal(parseCiudad(["  Barcelona   centro  "]), "Barcelona centro");
  assert.equal(parseCiudad(undefined), "");
});

test("el filtro parcial incluye variantes de barrio y no distingue acentos ni caja", () => {
  assert.equal(pasaCiudad("Barcelona", "Barcelona - La Garriga"), true);
  assert.equal(pasaCiudad("barcelona", "16 PG. DE ST. JOAN, BARCELONA, CT 08010, ES"), true);
  assert.equal(pasaCiudad("malaga", "Málaga"), true);
  assert.equal(pasaCiudad("arcelo", "Barcelona"), true);
  assert.equal(pasaCiudad("Barcelona", "Badalona"), false);
  assert.equal(pasaCiudad("Málaga", "Madrid"), false);
  assert.equal(pasaCiudad("Málaga", null), false);
  assert.equal(pasaCiudad("", null), true);
});
