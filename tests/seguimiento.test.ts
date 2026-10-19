import { test } from "node:test";
import assert from "node:assert/strict";
import { agregar, arquetiposOrdenados, periodoDe, periodosEntre, type FilaSeguimiento } from "../src/lib/seguimiento.ts";

const f = (d: string, p: string, r: "w" | "l" | "t", t = "liga", a: string | null = "Dragapult"): FilaSeguimiento => ({ d, p, r, t, a });
const TODO = ["liga", "presencial", "online", "amistoso"];

test("periodos: semanas de lunes a domingo", () => {
  assert.equal(periodoDe("2026-10-15", "semana"), "2026-10-12"); // jueves → lunes
  assert.equal(periodoDe("2026-10-12", "semana"), "2026-10-12"); // lunes
  assert.equal(periodoDe("2026-10-18", "semana"), "2026-10-12"); // domingo
  assert.equal(periodoDe("2026-10-15", "mes"), "2026-10");
});

test("EL EJE ES CONTINUO: los periodos vacíos existen", () => {
  // La gráfica del Elo repetía «26 sept, 26 sept» porque cada partida era un
  // punto. Aquí cada periodo es uno, haya partidas o no.
  assert.deepEqual(periodosEntre("2026-10-01", "2026-10-04", "dia"), ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
  assert.deepEqual(periodosEntre("2026-11-20", "2027-02-01", "mes"), ["2026-11", "2026-12", "2027-01", "2027-02"]);
});

test("partidas, récord y % por jugador y periodo", () => {
  const r = agregar([f("2026-10-01", "ibai", "w"), f("2026-10-01", "ibai", "l"), f("2026-10-01", "ibai", "t")],
    { jugadores: ["ibai"], tipos: TODO, arquetipo: null, granularidad: "dia" });
  const c = r.series.ibai[0];
  assert.deepEqual([c.n, c.w, c.l, c.t], [3, 1, 1, 1]);
  assert.equal(c.pct, 0.5); // victoria + media de empate, entre 3
});

test("un periodo sin partidas es un HUECO (null), no un 0 %", () => {
  const r = agregar([f("2026-10-01", "ibai", "w"), f("2026-10-03", "ibai", "w")],
    { jugadores: ["ibai"], tipos: TODO, arquetipo: null, granularidad: "dia" });
  assert.equal(r.series.ibai[1].n, 0);
  assert.equal(r.series.ibai[1].pct, null);
});

test("filtro de tipo y de arquetipo", () => {
  const filas = [f("2026-10-01", "ibai", "w", "liga", "Dragapult"), f("2026-10-01", "ibai", "l", "online", "Gardevoir")];
  assert.equal(agregar(filas, { jugadores: ["ibai"], tipos: ["online"], arquetipo: null, granularidad: "dia" }).series.ibai[0].n, 1);
  assert.equal(agregar(filas, { jugadores: ["ibai"], tipos: TODO, arquetipo: "Dragapult", granularidad: "dia" }).series.ibai[0].w, 1);
});

test("quitar a alguien de la gráfica no cambia el eje", () => {
  const filas = [f("2026-10-01", "ibai", "w"), f("2026-10-09", "alex", "w")];
  const solo = agregar(filas, { jugadores: ["ibai"], tipos: TODO, arquetipo: null, granularidad: "dia" });
  assert.equal(solo.periodos.length, 9);
});

test("arquetipos de un periodo, del más jugado al menos", () => {
  const r = agregar([f("2026-10-01", "ibai", "w", "liga", "B"), f("2026-10-01", "ibai", "w", "liga", "A"), f("2026-10-01", "ibai", "w", "liga", "A")],
    { jugadores: ["ibai"], tipos: TODO, arquetipo: null, granularidad: "dia" });
  assert.deepEqual(arquetiposOrdenados(r.series.ibai[0]), [["A", 2], ["B", 1]]);
});

test("sin filas que pasen los filtros: sin periodos, sin romperse", () => {
  assert.deepEqual(agregar([], { jugadores: ["ibai"], tipos: TODO, arquetipo: null, granularidad: "mes" }).periodos, []);
});
