import { test } from "node:test";
import assert from "node:assert/strict";
import { resumenDeTemporada, type PartidaTemporada } from "../src/lib/resumenTemporada.ts";

const p = (fecha: string, r: "w" | "l" | "t", suMazo = "Gardevoir", miMazo = "Dragapult"): PartidaTemporada => ({ fecha, r, miMazo, suMazo });

test("una temporada: marca, racha, mazo más jugado, cruces, mes más activo y Elo", () => {
  const r = resumenDeTemporada([
    p("2026-09-03", "w"), p("2026-09-10", "w"), p("2026-09-17", "w", "Raging Bolt"), p("2026-09-24", "l", "Raging Bolt"),
    p("2026-10-01", "w"), p("2026-10-08", "l", "Raging Bolt"), p("2026-10-15", "t", "Raging Bolt", "Charizard"),
    p("2026-10-22", "w", "Gholdengo"), p("2026-10-29", "l", ""),
  ], [
    { nombre: "Cup A", fecha: "2026-09-20", puesto: 3, jugadores: 24, cp: 32 },
    { nombre: "Regional B", fecha: "2026-10-18", puesto: 3, jugadores: 900, cp: 0 },
    { nombre: "Challenge C", fecha: "2026-10-25", puesto: 9, jugadores: 16, cp: 0 },
    { nombre: "Sin puesto", fecha: "2026-11-01", puesto: null, jugadores: null, cp: 6 },
  ], [{ fecha: "2026-09-03", valor: 1000 }, { fecha: "2026-10-01", valor: 1180.4 }, { fecha: "2026-10-29", valor: 1122.6 }]);
  assert.deepEqual([r.partidas, r.w, r.l, r.t], [9, 5, 3, 1]);
  assert.equal(r.pct, 5.5 / 9);
  assert.equal(r.rachaVictorias, 3);
  assert.deepEqual(r.mazoMasJugado, { mazo: "Dragapult", n: 8, pct: 5 / 8 });
  assert.equal(r.mazosDistintos, 2);
  assert.deepEqual(r.mejorCruce, { mazo: "Gardevoir", w: 3, l: 0, t: 0, pct: 1 });
  assert.deepEqual(r.peorCruce, { mazo: "Raging Bolt", w: 1, l: 2, t: 1, pct: 1.5 / 4 });
  assert.deepEqual(r.mesMasActivo, { mes: "2026-10", n: 5 });
  // A igual puesto manda el torneo más grande.
  assert.deepEqual(r.mejorPuesto, { nombre: "Regional B", puesto: 3, jugadores: 900 });
  assert.deepEqual([r.torneos, r.cp, r.podios], [4, 38, 2]);
  assert.deepEqual(r.elo, { inicio: 1000, fin: 1123, pico: 1180, cambio: 123 });
});

test("sin datos, guiones y no ceros; y un cruce con menos de 3 partidas no es «el mejor»", () => {
  const v = resumenDeTemporada([], []);
  assert.deepEqual([v.partidas, v.pct, v.mejorPuesto, v.mazoMasJugado, v.mejorCruce, v.peorCruce, v.mesMasActivo, v.elo, v.rachaVictorias],
    [0, null, null, null, null, null, null, null, 0]);
  const r = resumenDeTemporada([p("2026-09-01", "w", "A"), p("2026-09-02", "w", "A"), p("2026-09-03", "l", "B")], []);
  assert.deepEqual([r.mejorCruce, r.peorCruce], [null, null]);
  // Con un solo cruce con base y ganador, no sale también como el peor.
  const u = resumenDeTemporada([p("2026-09-01", "w", "A"), p("2026-09-02", "w", "A"), p("2026-09-03", "l", "A")], []);
  assert.equal(u.mejorCruce?.mazo, "A");
  assert.equal(u.peorCruce, null);
});
