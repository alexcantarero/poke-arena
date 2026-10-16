import { test } from "node:test";
import assert from "node:assert/strict";
import { etapaDeRonda, formaDe } from "../src/lib/estructura.ts";

// La estructura de la captura: Moujii's Dojo, online.
// 8 rondas suizas → los de 16 puntos o top 8 → 3 rondas más → top 8.
const MOUJII = { kind: "online", playerCount: 180, rounds: 11, roundsPhase2: 3, topCut: 8 };

test("Moujii's Dojo: 8 de fase 1, 3 de fase 2, top 8", () => {
  const f = formaDe(MOUJII);
  assert.equal(f.suizo, 11);
  assert.equal(f.fase1, 8);
  assert.equal(f.dosFases, true);
  assert.equal(f.faseManual, true);
  assert.equal(f.corte, 8);
});

test("cada ronda lleva su etiqueta: suizo, Fase 2, y la eliminatoria", () => {
  assert.equal(etapaDeRonda(8, MOUJII).etiqueta, null);        // última de fase 1
  assert.equal(etapaDeRonda(9, MOUJII).etiqueta, "Fase 2");
  assert.equal(etapaDeRonda(11, MOUJII).etiqueta, "Fase 2");
  // Top 8 = cuartos, semis y final después de las 11 suizas.
  assert.equal(etapaDeRonda(12, MOUJII).tipo, "corte");
  assert.equal(etapaDeRonda(14, MOUJII).tipo, "corte");
});

test("antes, un online salía todo como suizo normal (familia «libre»)", () => {
  // Sin fase propia sigue igual que siempre: no se rompe nada de lo que había.
  const sinFase = { kind: "online", playerCount: 180, rounds: 8, topCut: 8 };
  assert.equal(etapaDeRonda(9, sinFase).tipo, "suizo");
  assert.equal(formaDe(sinFase).dosFases, false);
});

test("una fase 2 imposible se ignora en vez de partir por un sitio que no existe", () => {
  // 5 rondas en total y «6 de fase 2»: pasa si se cambian las rondas desde
  // el panel de asistencia sin tocar la fase 2.
  const f = formaDe({ kind: "online", rounds: 5, roundsPhase2: 6, topCut: 0 });
  assert.equal(f.faseManual, false);
  assert.equal(f.fase1, 5);
  assert.equal(formaDe({ kind: "online", rounds: 5, roundsPhase2: 5, topCut: 0 }).faseManual, false);
});

test("lo tecleado manda sobre la tabla oficial también en un Regional", () => {
  const regional = { kind: "regional", playerCount: 3342, rounds: 14, topCut: 8 };
  assert.equal(formaDe(regional).fase1, 8);                     // tabla: 8 + 6
  assert.equal(formaDe({ ...regional, roundsPhase2: 4 }).fase1, 10); // tecleado: 10 + 4
});

test("un Challenge sigue sin corte… salvo que tenga estructura propia", () => {
  assert.equal(formaDe({ kind: "league_challenge", rounds: 5, topCut: 8 }).corte, 0);
  assert.equal(formaDe({ kind: "league_challenge", rounds: 8, roundsPhase2: 3, topCut: 8 }).corte, 8);
});

/* ------------------------------------------ v0.47: umbrales de paso ----- */

import { reglaDePaso, veredictoPaso } from "../src/lib/estructura.ts";

const MOUJII_UMBRALES = { ...MOUJII, phase2Points: 16, phase2Top: 8, cutPoints: 24 };

test("los umbrales de la captura: 16 puntos o top 8, y 24 puntos para el corte", () => {
  const f = formaDe(MOUJII_UMBRALES);
  assert.deepEqual(f.paso2, { puntos: 16, top: 8 });
  assert.deepEqual(f.pasoCorte, { puntos: 24, top: 8 });
});

test("con los puntos se pasa seguro", () => {
  assert.equal(veredictoPaso(16, { puntos: 16, top: 8 }), "dentro");
  assert.equal(veredictoPaso(19, { puntos: 16, top: 8 }), "dentro");
});

test("LA REGLA: sin los puntos NO es «fuera», es «depende»", () => {
  // Si menos de 8 llegan a 16, pasan los 8 primeros: con 13 se puede entrar.
  // Decir «fuera» sería decirle a alguien que no ha entrado cuando quizá sí.
  assert.equal(veredictoPaso(13, { puntos: 16, top: 8 }), "depende");
  assert.equal(veredictoPaso(0, { puntos: 16, top: 8 }), "depende");
});

test("sin umbral tecleado no hay veredicto propio", () => {
  assert.equal(veredictoPaso(20, null), null);
  assert.equal(formaDe(MOUJII).paso2, null);
});

test("el top por defecto es 8 si no se dijo", () => {
  assert.deepEqual(formaDe({ ...MOUJII, phase2Points: 16 }).paso2, { puntos: 16, top: 8 });
});

test("en un torneo oficial no se usan: los pone el reglamento", () => {
  const regional = { kind: "regional", playerCount: 3342, rounds: 14, topCut: 8, phase2Points: 16, cutPoints: 30 };
  assert.equal(formaDe(regional).paso2, null);
  assert.equal(formaDe(regional).pasoCorte, null);
});

test("la regla se lee entera", () => {
  assert.equal(reglaDePaso({ puntos: 16, top: 8 }, "la fase 2"),
    "Pasan a la fase 2 los de 16 puntos o más, o el top 8 si así pasa más gente.");
});
