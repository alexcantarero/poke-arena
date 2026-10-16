import { test } from "node:test";
import assert from "node:assert/strict";
import { torneosParaCerrar } from "../src/lib/limpieza.ts";

const AHORA = new Date("2026-10-20T12:00:00Z");
const t = (id: string, date: string, status = "open", endDate: string | null = null) => ({ id, status, date, endDate });

test("en curso, con datos y de hace más de una semana: se cierra", () => {
  assert.deepEqual(torneosParaCerrar([t("a", "2026-10-11")], new Set(["a"]), AHORA), ["a"]);
});

test("de hace menos de una semana: sigue abierto", () => {
  assert.deepEqual(torneosParaCerrar([t("a", "2026-10-15")], new Set(["a"]), AHORA), []);
});

test("sin participación NO se cierra: eso lo borra la limpieza de los tres días", () => {
  assert.deepEqual(torneosParaCerrar([t("a", "2026-09-01")], new Set(), AHORA), []);
});

test("los borradores no se tocan: un borrador no se cierra, se empieza", () => {
  assert.deepEqual(torneosParaCerrar([t("a", "2026-09-01", "draft")], new Set(["a"]), AHORA), []);
});

test("los ya cerrados no se vuelven a cerrar", () => {
  assert.deepEqual(torneosParaCerrar([t("a", "2026-09-01", "closed")], new Set(["a"]), AHORA), []);
});

test("un torneo de varios días cuenta desde el ÚLTIMO día", () => {
  // Empezó hace diez días pero acabó hace cinco: aún no toca.
  assert.deepEqual(torneosParaCerrar([t("a", "2026-10-10", "open", "2026-10-15")], new Set(["a"]), AHORA), []);
});

test("justo en el límite: se espera al día siguiente", () => {
  // Acabó el 13 a última hora; el 20 a mediodía aún no han pasado 7 días enteros.
  assert.deepEqual(torneosParaCerrar([t("a", "2026-10-13")], new Set(["a"]), AHORA), []);
  assert.deepEqual(torneosParaCerrar([t("a", "2026-10-12")], new Set(["a"]), AHORA), ["a"]);
});
