import { test } from "node:test";
import assert from "node:assert/strict";
import {
  actividadTexto, diasEntre, ordenarCompeticiones, partidasEsperadas, progresoLiga,
} from "../src/lib/resumenLiga.ts";

test("todos contra todos: n·(n−1)/2", () => {
  assert.equal(partidasEsperadas("league", 12), 66);
  assert.equal(partidasEsperadas("league", 2), 1);
});

test("sin número fijo, sin progreso: suizo, eliminatoria y equipos", () => {
  assert.equal(partidasEsperadas("swiss", 12), null);
  assert.equal(partidasEsperadas("bracket", 8), null);
  assert.equal(partidasEsperadas("league", 9, "equipos"), null);
  assert.equal(partidasEsperadas("league", 1), null);
});

test("progreso normal", () => {
  assert.deepEqual(progresoLiga(33, 66), { jugadas: 33, esperadas: 66, fraccion: 0.5 });
});

test("una liga a doble vuelta no enseña «120 %»: no se dice nada", () => {
  assert.equal(progresoLiga(80, 66), null);
});

test("sin número esperado, sin progreso", () => {
  assert.equal(progresoLiga(10, null), null);
});

test("diasEntre y actividadTexto", () => {
  assert.equal(diasEntre("2026-10-10", "2026-10-15"), 5);
  assert.equal(actividadTexto(0), "hoy");
  assert.equal(actividadTexto(1), "ayer");
  assert.equal(actividadTexto(5), "hace 5 días");
});

test("orden: en curso primero, y dentro de cada grupo la más reciente", () => {
  const r = ordenarCompeticiones([
    { id: "vieja-cerrada", status: "done", start: "2026-01-01" },
    { id: "en-curso-vieja", status: "live", start: "2026-08-01" },
    { id: "nueva-cerrada", status: "done", start: "2026-09-01" },
    { id: "en-curso-nueva", status: "live", start: "2026-10-01" },
  ]);
  assert.deepEqual(r.map((c) => c.id), ["en-curso-nueva", "en-curso-vieja", "nueva-cerrada", "vieja-cerrada"]);
});
