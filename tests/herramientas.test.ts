import { test } from "node:test";
import assert from "node:assert/strict";
import {
  comb, consistencia, generador, hiper, premiosDeCarta, premiosDeDos,
  probCorteDesde, recordsDePuntos, simularSuizo,
} from "../src/lib/herramientas.ts";

const cerca = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} ≉ ${b}`);

test("combinatoria y hipergeométrica", () => {
  assert.equal(comb(60, 7), 386206920);
  assert.equal(comb(5, 7), 0);
  let s = 0; for (let k = 0; k <= 4; k++) s += hiper(60, 4, 6, k);
  cerca(s, 1);
});

test("premios: una carta con 4 copias", () => {
  const r = premiosDeCarta(4)!;
  cerca(r.exacto.reduce((a, b) => a + b, 0), 1);
  // P(ninguna en premios) = C(56,6)/C(60,6)
  cerca(r.exacto[0], comb(56, 6) / comb(60, 6));
  cerca(r.todas, comb(56, 2) / comb(60, 6));
  assert.equal(premiosDeCarta(1)!.todas, premiosDeCarta(1)!.exacto[1]);
  assert.equal(premiosDeCarta(70), null); // sin NaN: dato imposible → null
});

test("premios: dos cartas, coherente con una sola", () => {
  const dos = premiosDeDos(4, 0)!;
  cerca(dos.alguna, premiosDeCarta(4)!.alMenosUna);
  assert.equal(dos.ambas, 0);
  const r = premiosDeDos(2, 2)!;
  assert.ok(r.ambas > 0 && r.ambas < r.alguna && r.alguna < 1);
  assert.equal(premiosDeDos(40, 30), null);
});

test("consistencia: sin salidas es 0, todo salidas es 1, y el mulligan cuadra", () => {
  const nada = consistencia(60, 12, 0, 0)!;
  assert.equal(nada.enMano, 0);
  cerca(nada.mulligan, comb(48, 7) / comb(60, 7));
  const todo = consistencia(60, 60, 60, 60)!;
  cerca(todo.enMano, 1);
});

test("consistencia: una salida básica, condicionada a no hacer mulligan", () => {
  // 1 básico que es la salida: si no hay mulligan, la tienes seguro.
  cerca(consistencia(60, 1, 1, 1)!.enMano, 1);
  const r = consistencia(60, 14, 8, 4)!;
  assert.ok(r.conRobo > r.enMano && r.enMano > 0 && r.enMano < 1);
  assert.equal(consistencia(60, 10, 4, 6), null); // más salidas básicas que salidas
  assert.equal(consistencia(Number.NaN, 10, 4, 2), null);
});

test("récords que dan unos puntos", () => {
  assert.deepEqual(recordsDePuntos(12, 5), ["4-1-0"]);
  assert.deepEqual(recordsDePuntos(10, 5), ["3-1-1"]); // 2-0-4 serían 6 rondas
  assert.deepEqual(recordsDePuntos(7, 5), ["2-2-1", "1-0-4"]);
});

test("suizo: 32 jugadores, 5 rondas, top 8 — el 4-1 casi siempre entra y el 2-3 nunca", () => {
  const r = simularSuizo({ jugadores: 32, rondas: 5, corte: 8, pEmpate: 0, iteraciones: 400, azar: generador(7) })!;
  const fila = (p: number) => r.filas.find((f) => f.puntos === p)!;
  assert.ok(fila(15).pCorte > 0.99);
  assert.ok(fila(12).pCorte > 0.8);
  assert.equal(fila(6).pCorte, 0);
  cerca(r.filas.reduce((a, f) => a + f.esperados, 0), 32, 1e-6);
  const enCorte = r.filas.reduce((a, f) => a + f.esperados * f.pCorte, 0);
  cerca(enCorte, 8, 1e-6);
});

test("suizo: dos fases recortan el Día 2 y el corte asimétrico no pasa de 16", () => {
  const r = simularSuizo({
    jugadores: 300, rondas: 9, corte: 8, pEmpate: 0.05, fase1: 7, umbralDia2: 16,
    asimetrico: true, maxCorte: 16, iteraciones: 60, azar: generador(3),
  })!;
  assert.ok(r.diaDos! > 0 && r.diaDos! < 300);
  const enCorte = r.filas.reduce((a, f) => a + f.esperados * f.pCorte, 0);
  assert.ok(enCorte >= 8 - 1e-6 && enCorte <= 16 + 1e-6);
});

test("suizo: entradas imposibles devuelven null, nunca NaN", () => {
  assert.equal(simularSuizo({ jugadores: 2, rondas: 3, corte: 0, pEmpate: 0 }), null);
  assert.equal(simularSuizo({ jugadores: 16, rondas: 4, corte: 32, pEmpate: 0 }), null);
});

test("qué me falta: con todo ganado y el corte seguro, 1; sin rondas, la fila", () => {
  const filas = [{ puntos: 12, records: [], esperados: 1, pCorte: 1 }, { puntos: 9, records: [], esperados: 1, pCorte: 0.5 }, { puntos: 6, records: [], esperados: 1, pCorte: 0 }];
  cerca(probCorteDesde(9, 0, 0, filas), 0.5);
  cerca(probCorteDesde(9, 1, 0, filas), 0.5 * 1 + 0.5 * 0.5);
});
