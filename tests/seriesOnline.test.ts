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
