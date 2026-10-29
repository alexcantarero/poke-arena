import { test } from "node:test";
import assert from "node:assert/strict";
import { CAMPO_TIPICO, planMundial, type ContadorPlan } from "../src/lib/planMundial.ts";

const challenge = [
  { from: 1, to: 1, cp: 15, minPlayers: 0 }, { from: 2, to: 2, cp: 12, minPlayers: 4 },
  { from: 3, to: 4, cp: 10, minPlayers: 8 }, { from: 5, to: 8, cp: 8, minPlayers: 14 },
];
const cup = [
  { from: 1, to: 1, cp: 50, minPlayers: 0 }, { from: 2, to: 2, cp: 40, minPlayers: 4 },
  { from: 3, to: 4, cp: 32, minPlayers: 8 }, { from: 5, to: 8, cp: 25, minPlayers: 17 },
  { from: 9, to: 16, cp: 20, minPlayers: 48 },
];
const regional = [
  { from: 1, to: 1, cp: 350, minPlayers: 0 }, { from: 9, to: 16, cp: 200, minPlayers: 33 },
  { from: 17, to: 32, cp: 160, minPlayers: 65 }, { from: 33, to: 64, cp: 120, minPlayers: 129 },
  { from: 65, to: 128, cp: 80, minPlayers: 257 }, { from: 129, to: 256, cp: 60, minPlayers: 513 },
];
const contadores = (llenos: { ch?: number[]; cu?: number[]; re?: number[] } = {}): ContadorPlan[] => [
  { contador: "league_challenge", etiqueta: "Challenge", contados: llenos.ch ?? [], huecos: 4,
    eventos: [{ tipo: "league_challenge", etiqueta: "Challenge", tramos: challenge, campoTipico: CAMPO_TIPICO.league_challenge }] },
  { contador: "league_cup", etiqueta: "Cup", contados: llenos.cu ?? [], huecos: 4,
    eventos: [{ tipo: "league_cup", etiqueta: "Cup", tramos: cup, campoTipico: CAMPO_TIPICO.league_cup }] },
  { contador: "regional", etiqueta: "Regional", contados: llenos.re ?? [], huecos: 5,
    eventos: [{ tipo: "regional", etiqueta: "Regional", tramos: regional, campoTipico: CAMPO_TIPICO.regional }] },
];

test("si ya llegas, no hay nada que recomendar", () => {
  const p = planMundial(700, contadores());
  assert.equal(p.faltan, 0);
  assert.deepEqual(p.pasos, []);
});

test("los pasos suman lo que falta, cada hueco una vez, y van de fácil a difícil", () => {
  const p = planMundial(100, contadores({ cu: [25, 25], re: [] }));
  assert.equal(p.faltan, 550);
  assert.ok(p.suma >= 550 && !p.inalcanzable);
  for (let i = 1; i < p.pasos.length; i++) assert.ok(p.pasos[i].dificultad >= p.pasos[i - 1].dificultad);
  assert.ok(p.pasos.every((x) => x.gana > 0 && x.cp > x.ahora));
});

test("con poco que falta, basta con lo fácil", () => {
  const p = planMundial(630, contadores());
  assert.ok(p.pasos.every((x) => x.contador !== "regional"));
  assert.ok(p.suma >= 20);
});

test("un puesto que pide más gente de la habitual no se recomienda", () => {
  const p = planMundial(0, contadores());
  assert.ok(!p.pasos.some((x) => x.tipo === "league_challenge" && x.puesto === "Top 32"));
});

test("si ni con todo se llega, se dice", () => {
  const solo: ContadorPlan[] = [contadores()[0]];
  const p = planMundial(0, solo, 650);
  assert.equal(p.inalcanzable, true);
  assert.equal(p.suma, 60); // 4 Challenges ganadas
});

import { minimoPorTipo, probDeTramo } from "../src/lib/planMundial.ts";

test("v0.80: la dificultad mezcla la base con vuestros resultados", () => {
  const sinDatos = probDeTramo({ to: 8 }, 40, []);
  assert.ok(Math.abs(sinDatos.p - 0.2) < 1e-9);
  const conDatos = probDeTramo({ to: 8 }, 40, [1, 3, 5, 7, 2, 9, 12, 4, 6, 8]);
  assert.ok(conDatos.p >= 0.5 && conDatos.hechos === 8); // 8 de 10 en top 8
});

test("v0.80: lo mínimo de cada tipo, o cuánto daría como mucho", () => {
  const m = minimoPorTipo(100, contadores(), 650);
  const re = m.find((x) => x.tipo === "regional")!;
  assert.ok(re.puesto && re.veces >= 2);   // con Regionales se llega
  const ch = m.find((x) => x.tipo === "league_challenge")!;
  assert.equal(ch.puesto, null);           // con Challenges, no
  assert.equal(ch.maximo, 60);
});
