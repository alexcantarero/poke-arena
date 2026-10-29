import { test } from "node:test";
import assert from "node:assert/strict";
import {
  alMejorDe3, campoDe, liderDe, notaConsistencia, pPartida, probTorneo, recomendar, tablaCruces, type Fuente,
} from "../src/lib/recomendador.ts";

test("el líder: lo primero que se nombra, sin «ex» ni acompañantes", () => {
  assert.equal(liderDe("Dragapult ex"), "dragapult");
  assert.equal(liderDe("Dragapult / Dusknoir"), "dragapult");
  assert.equal(liderDe("Gardevoir & Jellicent"), "gardevoir");
  assert.equal(liderDe("N's Zoroark ex"), "zoroark");
  assert.equal(liderDe("Mega Excadrill ex"), "excadrill-mega");
  assert.equal(liderDe(""), "");
});

test("el campo suma 1 y una fuente con pocos datos pesa menos", () => {
  const f: Fuente[] = [
    { id: "regionales", cuota: { dragapult: 300, gardevoir: 100 } },
    { id: "grupo", cuota: { charizard: 2 } },
  ];
  const c = campoDe("regional", f);
  const suma = Object.values(c).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(suma - 1) < 1e-9);
  assert.ok(c.dragapult > c.gardevoir && c.gardevoir > c.charizard);
});

test("emparejamientos: encogidos al 50 % y simétricos", () => {
  const t = tablaCruces([{ id: "online", cuota: {}, cruces: [{ a: "x", b: "y", w: 6, l: 0, t: 0 }] }]);
  const xy = pPartida(t, "x", "y");
  assert.ok(xy.p > 0.5 && xy.p < 0.9); // 6-0 no es «100 %»
  assert.ok(Math.abs(pPartida(t, "y", "x").p - (1 - xy.p)) < 1e-9);
  assert.equal(pPartida(t, "x", "x").p, 0.5);
});

test("al mejor de 3 amplifica la ventaja", () => {
  assert.equal(alMejorDe3(0.5), 0.5);
  assert.ok(alMejorDe3(0.6) > 0.6);
  assert.ok(alMejorDe3(0.4) < 0.4);
});

test("el torneo: ganar más rondas sube todas las probabilidades", () => {
  const e = { rondas: 5, corte: 8, pCorte: { 15: 1, 12: 1, 9: 0.2 } };
  const media = probTorneo(0.5, e), fuerte = probTorneo(0.6, e);
  assert.ok(fuerte.pTop > media.pTop && fuerte.pGanar > media.pGanar && fuerte.pPositivo > media.pPositivo);
  const dos = probTorneo(0.5, { rondas: 9, corte: 8, fase1: 7, umbral: 16, pCorte: { 27: 1, 24: 1, 21: 0.5 } });
  assert.ok(dos.pDia2! > 0 && dos.pDia2! < 1);
});

test("la recomendación pone arriba al mazo con mejores cruces contra el campo", () => {
  const fuentes: Fuente[] = [{
    id: "online", cuota: { a: 50, b: 50, c: 50 },
    cruces: [
      { a: "a", b: "b", w: 70, l: 30, t: 0 }, { a: "a", b: "c", w: 60, l: 40, t: 0 },
      { a: "b", b: "c", w: 50, l: 50, t: 0 },
    ],
  }];
  const r = recomendar({ tipo: "league_cup", objetivo: "top", fuentes, estructura: { rondas: 5, corte: 8, pCorte: { 15: 1, 12: 1, 9: 0.2 } } });
  assert.equal(r.filas[0].lider, "a");
  assert.ok(r.filas[0].indice > 1);
  assert.ok(r.filas.every((f) => Number.isFinite(f.pObjetivo)));
});

test("consistencia del 1 al 10", () => {
  assert.equal(notaConsistencia(0.1, null, 0), 10);
  assert.equal(notaConsistencia(0.2, null, 0), 6);
  assert.equal(notaConsistencia(null, 10, 40), 4); // 25 % real
  assert.equal(notaConsistencia(null, null, 0), null);
});

test("sin corte (Challenge): ganar es acabar primero", () => {
  const e = { rondas: 5, corte: 1, pCorte: { 15: 1, 12: 0.6 }, pPrimero: { 15: 1, 12: 0.1 } };
  const r = probTorneo(0.5, e);
  assert.ok(r.pGanar > 0 && r.pGanar < r.pTop);
});

import { calibrar, evaluar, mejorVariante } from "../src/lib/recomendador.ts";

test("calibrar: α < 1 acerca al 50 %, α > 1 aleja", () => {
  assert.equal(calibrar(0.7, 1), 0.7);
  assert.ok(Math.abs(calibrar(0.7, 0.5) - 0.6) < 1e-9);
  assert.ok(calibrar(0.7, 1.5) > 0.7);
});

test("evaluar: un modelo demasiado seguro aprende un α < 1", () => {
  // Dice 80 % y solo gana el 60 %: se pasa de seguro.
  const ms = Array.from({ length: 100 }, (_, i) => ({ p: 0.8, r: (i < 60 ? 1 : 0) as 0 | 1 }));
  const e = evaluar(ms);
  assert.ok(e.alfa < 1);
  assert.ok(e.brierCalibrado! < e.brier!);
  assert.equal(e.acierto, 0.6);
  assert.equal(evaluar(ms.slice(0, 10)).alfa, 1); // con pocas rondas, no se toca
});

test("la mejor variante: mejor % con datos suficientes", () => {
  const v = mejorVariante([
    { clave: "dragapult|dusknoir", nombre: "Dragapult Dusknoir", w: 60, l: 40, t: 0, listas: 0, corte: 0, conPuesto: 0 },
    { clave: "dragapult|pidgeot", nombre: "Dragapult Pidgeot", w: 45, l: 55, t: 0, listas: 0, corte: 0, conPuesto: 0 },
    { clave: "dragapult|raro", nombre: "Dragapult raro", w: 4, l: 0, t: 0, listas: 0, corte: 0, conPuesto: 0 },
  ], null)!;
  assert.equal(v.clave, "dragapult|dusknoir");
});

import { PESOS_CRUCES } from "../src/lib/recomendador.ts";

test("los cruces online pesan menos en un Regional que en una Challenge", () => {
  const f = [{ id: "online", cuota: {}, cruces: [{ a: "x", b: "y", w: 70, l: 30, t: 0 }] }];
  const ch = pPartida(tablaCruces(f, PESOS_CRUCES.league_challenge), "x", "y").p;
  const rg = pPartida(tablaCruces(f, PESOS_CRUCES.regional), "x", "y").p;
  assert.ok(ch > rg && rg > 0.5);
});

test("TCG Live solo mueve la Challenge", () => {
  const fuentes = [{ id: "online", cuota: { a: 50, b: 50 } }];
  const e = { rondas: 5, corte: 8, pCorte: { 15: 1, 12: 1, 9: 0.2 } };
  const live = { a: { w: 80, l: 20 } };
  const ch = recomendar({ tipo: "league_challenge", objetivo: "top", fuentes, estructura: e, live }).filas.find((x) => x.lider === "a")!;
  const cu = recomendar({ tipo: "league_cup", objetivo: "top", fuentes, estructura: e, live }).filas.find((x) => x.lider === "a")!;
  assert.ok(ch.pRonda > 0.5);
  assert.ok(Math.abs(cu.pRonda - 0.5) < 1e-9);
});
