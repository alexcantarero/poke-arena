import { test } from "node:test";
import assert from "node:assert/strict";
import { CAUSAS_DERROTA, contarCausas, esNoPresentado, leerCausas } from "../src/lib/causasDerrota.ts";

test("leer causas: solo las válidas, sin repetir y en orden", () => {
  assert.deepEqual(leerCausas("misplay,matchup,MISPLAY,inventada"), ["matchup", "misplay"]);
  assert.deepEqual(leerCausas(""), []);
  assert.deepEqual(leerCausas(null), []);
  assert.equal(CAUSAS_DERROTA.length, 11);
});

test("contar: de más a menos, y el % sobre las derrotas etiquetadas", () => {
  const r = contarCausas([{ causas: ["matchup", "mulligan"] }, { causas: ["matchup"] }, { causas: [] }, { causas: ["varianza"] }]);
  assert.deepEqual(r.map((x) => [x.causa, x.n]), [["matchup", 2], ["mulligan", 1], ["varianza", 1]]);
  assert.equal(r[0].pct, 2 / 3);
  assert.deepEqual(contarCausas([]), []);
});

test("no presentado: se reconoce por la nota", () => {
  assert.equal(esNoPresentado("No presentado: Alex"), true);
  assert.equal(esNoPresentado("no presentada"), true);
  assert.equal(esNoPresentado("Partida muy igualada"), false);
  assert.equal(esNoPresentado(null), false);
});
