import { test } from "node:test";
import assert from "node:assert/strict";
import { dentroDeRango, filtroAQuery, parseFiltroRanking, rangoDeFechas } from "../src/lib/rankingFiltro.ts";

test("sin parámetros: todo, ambos, todas las fechas", () => {
  const f = parseFiltroRanking({});
  assert.equal(f.vista, "all");
  assert.equal(f.fecha, "");
  assert.equal(filtroAQuery(f).toString(), "");
});

test("URLs de antes siguen funcionando", () => {
  const f = parseFiltroRanking({ ambito: "online", temporada: "1" });
  assert.equal(f.vista, "tournament");
  assert.equal(f.donde, "online");
  assert.equal(f.fecha, "temporada");
});

test("el tipo de torneo no se aplica a liga ni a amistosos", () => {
  assert.equal(parseFiltroRanking({ ambito: "league", tipo: "regional" }).tipo, "");
  assert.equal(parseFiltroRanking({ ambito: "tournament", tipo: "regional" }).tipo, "regional");
});

test("últimos 30 días y este año", () => {
  assert.deepEqual(rangoDeFechas(parseFiltroRanking({ fecha: "30d" }), "2026-10-04"), { from: "2026-09-04", to: "2026-10-04" });
  assert.deepEqual(rangoDeFechas(parseFiltroRanking({ fecha: "anio" }), "2026-10-04"), { from: "2026-01-01", to: "2026-10-04" });
});

test("rango al revés se corrige; fecha mal escrita se ignora", () => {
  const r = rangoDeFechas(parseFiltroRanking({ fecha: "rango", desde: "2026-10-01", hasta: "2026-09-01" }), "2026-10-04");
  assert.deepEqual(r, { from: "2026-09-01", to: "2026-10-01" });
  assert.equal(parseFiltroRanking({ fecha: "rango", desde: "ayer" }).desde, "");
});

test("dentroDeRango es inclusivo en los dos extremos", () => {
  const r = { from: "2026-09-01", to: "2026-09-30" };
  assert.equal(dentroDeRango("2026-09-01", r), true);
  assert.equal(dentroDeRango("2026-09-30", r), true);
  assert.equal(dentroDeRango("2026-10-01", r), false);
  assert.equal(dentroDeRango("2026-10-01", null), true);
});
