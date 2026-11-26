import { test } from "node:test";
import assert from "node:assert/strict";
import { ajustar, backtest, estimarCruce, metricas, pesoTorneo, type PartidaModelo } from "../src/lib/recommender/modelo.ts";

const m = (fecha: string, a: string, b: string, r: 1 | 0 | 0.5, tipo = "regional"): PartidaModelo => ({ fecha, a, b, r, tipo });

test("SIN FUGAS: lo posterior al corte no cuenta, y lo del mismo día tampoco", () => {
  const ps = [m("2026-10-01", "drago", "garde", 1), m("2026-11-20", "drago", "garde", 0), m("2026-11-10", "drago", "garde", 0)];
  const e = estimarCruce(ps, "drago", "garde", "2026-11-10");
  assert.equal(e.n, 1);
  assert.equal(e.ultimo, "2026-10-01");
  assert.ok(e.p > 0.5);
});

test("encogimiento: sin datos, 50 %; con pocos, cerca del 50; con muchos, se acerca a lo observado", () => {
  assert.equal(estimarCruce([], "a", "b", "2026-11-01").p, 0.5);
  const uno = estimarCruce([m("2026-10-31", "a", "b", 1)], "a", "b", "2026-11-01", { tau: Infinity, prior: 8, ventana: Infinity });
  assert.ok(Math.abs(uno.p - 5 / 9) < 1e-9); // Beta(4+1, 4)
  const muchas = Array.from({ length: 200 }, (_, i) => m("2026-10-31", "a", "b", i % 4 === 0 ? 0 : 1));
  const e = estimarCruce(muchas, "a", "b", "2026-11-01", { tau: Infinity, prior: 8, ventana: Infinity });
  assert.ok(Math.abs(e.p - 0.75) < 0.02);
  assert.ok(e.ic[0] < e.p && e.p < e.ic[1] && e.ic[1] - e.ic[0] < 0.12);
  // B contra A cuenta al revés.
  assert.ok(Math.abs(estimarCruce(muchas, "b", "a", "2026-11-01", { tau: Infinity, prior: 8, ventana: Infinity }).p - (1 - e.p)) < 1e-9);
});

test("recencia y peso del torneo: lo reciente y lo competitivo pesan más", () => {
  const viejo = m("2026-05-01", "a", "b", 0), nuevo = m("2026-10-30", "a", "b", 1);
  assert.ok(estimarCruce([viejo, nuevo], "a", "b", "2026-11-01", { tau: 60, prior: 2, ventana: Infinity }).p > 0.6);
  const online = m("2026-10-30", "a", "b", 0, "online"), regional = m("2026-10-30", "a", "b", 1, "regional");
  // Beta(1 + 1, 1 + 0,4): 2 / 3,4 ≈ 0,59.
  assert.ok(estimarCruce([online, regional], "a", "b", "2026-11-01", { tau: Infinity, prior: 2, ventana: Infinity }).p > 0.55);
  assert.equal(pesoTorneo("desconocido"), 0.4);
  // Ventana: fuera de los últimos 30 días no cuenta.
  assert.equal(estimarCruce([viejo], "a", "b", "2026-11-01", { tau: 60, prior: 2, ventana: 30 }).n, 0);
});

test("métricas: Brier, log-loss y la línea base del 50 %", () => {
  const x = metricas([{ p: 0.8, r: 1 }, { p: 0.3, r: 0 }]);
  assert.ok(Math.abs(x.brier! - (0.04 + 0.09) / 2) < 1e-12);
  assert.equal(x.brierBase, 0.25);
  assert.equal(x.acierto, 1);
  assert.ok(Math.abs(x.logloss! - -(Math.log(0.8) + Math.log(0.7)) / 2) < 1e-12);
  assert.deepEqual(metricas([]), { n: 0, brier: null, logloss: null, brierBase: null, acierto: null });
});

test("backtest: un cruce estable se aprende y bate a la moneda; el ajuste ordena por Brier", () => {
  const ps: PartidaModelo[] = [];
  for (let i = 0; i < 60; i++) {
    const f = new Date(Date.UTC(2026, 6, 1) + i * 2 * 86_400_000).toISOString().slice(0, 10);
    ps.push(m(f, "a", "b", i % 5 === 0 ? 0 : 1)); // a gana el 80 %
  }
  const r = backtest(ps);
  assert.ok(r.n >= 50);
  assert.ok(r.brier! < r.brierBase!);
  const aj = ajustar(ps, [30, 60, Infinity], [2, 8]);
  assert.equal(aj.length, 6);
  assert.ok(aj[0].m.brier! <= aj[aj.length - 1].m.brier!);
});
