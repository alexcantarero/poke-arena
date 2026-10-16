import { test } from "node:test";
import assert from "node:assert/strict";
import {
  detectarSeries, idEventoPrevisto, nombreBase, proximasEdiciones, type TorneoOnline,
} from "../src/lib/seriesOnline.ts";

const AHORA = new Date("2026-10-15T12:00:00Z");
const t = (name: string, date: string, players: number, organizerId = 7): TorneoOnline =>
  ({ id: `${name}-${date}`, name, date, players, organizerId });

/** Una serie semanal: domingo a las 18:00 UTC durante `n` semanas. */
const semanal = (base: string, n: number, players: number, org = 7) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(2026, 9, 11 - 7 * (n - 1 - i), 18));
    return t(`${base} #${10 + i}`, d.toISOString(), players, org);
  });

test("nombreBase quita la numeración y deja lo que se repite", () => {
  assert.equal(nombreBase("Pudding Weekly #14"), "Pudding Weekly");
  assert.equal(nombreBase("Torneo Relámpago ⚡ #82"), "Torneo Relámpago ⚡");
  assert.equal(nombreBase("Sunday Cup (Oct 12)"), "Sunday Cup");
  assert.equal(nombreBase("Friday Clash Week 3"), "Friday Clash");
  assert.equal(nombreBase("Monthly Masters 12"), "Monthly Masters");
});

test("detecta una serie semanal con más de 100 jugadores", () => {
  const s = detectarSeries(semanal("Pudding Weekly", 5, 140), AHORA);
  assert.equal(s.length, 1);
  assert.equal(s[0].nombre, "Pudding Weekly");
  assert.equal(s[0].ediciones, 5);
  assert.equal(s[0].mediaJugadores, 140);
});

test("por debajo de 100 de media no entra", () => {
  assert.equal(detectarSeries(semanal("Pequeña", 5, 60), AHORA).length, 0);
});

test("con menos de 3 ediciones no se puede decir que sea semanal", () => {
  assert.equal(detectarSeries(semanal("Nueva", 2, 300), AHORA).length, 0);
});

test("mensual no es semanal", () => {
  const mensual = [0, 1, 2].map((i) => t(`Monthly #${i}`, new Date(Date.UTC(2026, 7 + i, 10, 18)).toISOString(), 400));
  assert.equal(detectarSeries(mensual, AHORA, { ventanaDias: 120 }).length, 0);
});

test("una semana sin celebrar no tumba una serie semanal (mediana, no media)", () => {
  const s = semanal("Pudding Weekly", 6, 150);
  s.splice(2, 1); // falta una edición: un hueco de 14 días
  assert.equal(detectarSeries(s, AHORA).length, 1);
});

test("dos organizadores con el mismo nombre son series distintas", () => {
  const r = detectarSeries([...semanal("Weekly", 4, 150, 1), ...semanal("Weekly", 4, 150, 2)], AHORA);
  assert.equal(r.length, 2);
});

test("los torneos futuros o fuera de la ventana no cuentan", () => {
  const viejos = semanal("Antigua", 5, 200).map((x) => ({ ...x, date: "2025-01-01T18:00:00Z" }));
  assert.equal(detectarSeries(viejos, AHORA).length, 0);
});

test("próximas ediciones: mismo día y hora, a partir de ahora", () => {
  const [serie] = detectarSeries(semanal("Pudding Weekly", 5, 140), AHORA);
  // La última fue el domingo 11 a las 18:00; ahora es jueves 15.
  assert.deepEqual(proximasEdiciones(serie, AHORA, 2), [
    "2026-10-18T18:00:00.000Z", "2026-10-25T18:00:00.000Z",
  ]);
});

test("el id del evento es estable: reimportar no duplica", () => {
  const [serie] = detectarSeries(semanal("Pudding Weekly", 5, 140), AHORA);
  const a = idEventoPrevisto(serie, "2026-10-18T18:00:00.000Z");
  assert.equal(a, idEventoPrevisto(serie, "2026-10-18T18:00:00.000Z"));
  assert.ok(a.startsWith("ltl-serie-"));
  assert.ok(a.endsWith("2026-10-18"));
});

/* ------------------------------------------------- v0.45: seguidas ------ */

import { normalizar } from "../src/lib/seriesOnline.ts";

const SEGUIDAS = ["crownofspain", "mouji"];

test("normalizar: el mismo nombre se escriba como se escriba", () => {
  assert.equal(normalizar("🏆 Moujii's Dojo 🏆"), "moujiisdojo");
  assert.ok(normalizar("🏆 Moujii's Dojo 🏆").includes("mouji"));
  assert.ok(normalizar("Mouji's Dojo").includes("mouji"));
  assert.equal(normalizar("CrownOfSpain #8"), "crownofspain8");
});

test("una serie seguida entra aunque tenga poca gente y solo dos ediciones", () => {
  const dos = semanal("CrownOfSpain", 2, 40);
  assert.equal(detectarSeries(dos, AHORA).length, 0, "sin seguir, no entra");
  const r = detectarSeries(dos, AHORA, { seguidas: SEGUIDAS });
  assert.equal(r.length, 1);
  assert.equal(r[0].seguida, true);
});

test("el nombre con emojis y sin numeración también agrupa", () => {
  // Moujii's Dojo se llama igual en cada edición: no lleva «#14».
  const eds = [4, 11].map((d) => t("🏆 Moujii's Dojo 🏆", new Date(Date.UTC(2026, 9, d, 19)).toISOString(), 60));
  const r = detectarSeries(eds, AHORA, { seguidas: SEGUIDAS });
  assert.equal(r.length, 1);
  assert.equal(r[0].nombre, "🏆 Moujii's Dojo 🏆");
});

test("una serie seguida quincenal también entra; una mensual, no", () => {
  const quincenal = [0, 1, 2].map((i) => t("CrownOfSpain", new Date(Date.UTC(2026, 8, 13 + 14 * i, 18)).toISOString(), 50));
  assert.equal(detectarSeries(quincenal, AHORA, { seguidas: SEGUIDAS }).length, 1);
  const mensual = [0, 1, 2].map((i) => t("CrownOfSpain", new Date(Date.UTC(2026, 6 + i, 10, 18)).toISOString(), 50));
  assert.equal(detectarSeries(mensual, AHORA, { seguidas: SEGUIDAS, ventanaDias: 120 }).length, 0);
});

/* ------------------------------------------ v0.45: más frecuentes ------- */

test("una serie DIARIA ya no se descarta por jugarse más de una vez a la semana", () => {
  // Antes se exigía una mediana de 6 a 8 días: una diaria (1) se tiraba.
  const diaria = Array.from({ length: 10 }, (_, i) =>
    t(`Daily Grind #${i}`, new Date(Date.UTC(2026, 9, 5 + i, 20)).toISOString(), 150));
  const [s] = detectarSeries(diaria, AHORA);
  assert.ok(s, "debería detectarla");
  assert.equal(s.franjas.length, 7, "una franja por cada día de la semana");
});

test("una diaria no llena el calendario: como mucho siete fechas", () => {
  const diaria = Array.from({ length: 10 }, (_, i) =>
    t(`Daily Grind #${i}`, new Date(Date.UTC(2026, 9, 5 + i, 20)).toISOString(), 150));
  const [s] = detectarSeries(diaria, AHORA);
  const fechas = proximasEdiciones(s, AHORA, 2);
  assert.equal(fechas.length, 7);
  // Y sin repetir día: el id del evento lleva la fecha.
  assert.equal(new Set(fechas.map((f) => f.slice(0, 10))).size, 7);
});

test("martes y sábados: dos franjas, y se prevén las dos", () => {
  const dosDias = [6, 10, 13].map((d, i) =>
    t(`Twice Weekly #${i}`, new Date(Date.UTC(2026, 9, d, 19)).toISOString(), 200));
  const [s] = detectarSeries(dosDias, AHORA);
  assert.equal(s.franjas.length, 2);
  const fechas = proximasEdiciones(s, AHORA, 1);
  assert.deepEqual(fechas.map((f) => new Date(f).getUTCDay()).sort(), [2, 6]);
});
