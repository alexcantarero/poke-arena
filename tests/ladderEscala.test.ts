import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeLadderInput, rankOf, ARCEUS_JUMP } from "../src/lib/rank.ts";

test("entradas permitidas: 1–550 y 1350–2100 se guardan tal cual", () => {
  assert.equal(normalizeLadderInput(1), 1);
  assert.equal(normalizeLadderInput(550), 550);
  assert.equal(normalizeLadderInput(1350), 1350);
  assert.equal(normalizeLadderInput(2100), 2100);
});

test("pasar de 550 es el salto Arceus: se guarda 1500", () => {
  assert.equal(normalizeLadderInput(551), ARCEUS_JUMP);
  assert.equal(normalizeLadderInput(1349), ARCEUS_JUMP);
});

test("fuera de rango se rechaza", () => {
  assert.equal(normalizeLadderInput(0), null);
  assert.equal(normalizeLadderInput(2101), null);
  assert.equal(normalizeLadderInput("hola"), null);
});

test("tramos: Novato, Hierro, Bronce y Challenger", () => {
  assert.equal(rankOf(300).tier.id, "novato");
  assert.equal(rankOf(300).arceus, false);
  assert.equal(rankOf(1400).tier.id, "hierro");
  assert.equal(rankOf(1449).tier.id, "hierro");
  assert.equal(rankOf(1450).tier.id, "bronce");
  assert.equal(rankOf(ARCEUS_JUMP).tier.id, "bronce");
  assert.equal(rankOf(2100).label, "Challenger");
});

test("en Novato, lo que falta es para el salto, no para Hierro", () => {
  const r = rankOf(540);
  assert.equal(r.toNext, 11);
  assert.equal(r.nextLabel, "Liga Arceus");
});

test("tras el salto se puede volver a perder puntos hasta Hierro", () => {
  assert.equal(rankOf(1360).tier.id, "hierro");
  assert.equal(rankOf(1360).arceus, true);
});
