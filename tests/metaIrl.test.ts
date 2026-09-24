import { test } from "node:test";
import assert from "node:assert/strict";
import {
  irlMeta, mejorConversion, top4Rate, top8Rate,
  type IrlEntry, type IrlEvent,
} from "../src/lib/metaIrl.ts";

const LILLE: IrlEvent = {
  id: "ev-lille", name: "Regional de Lille", date: "2027-02-14", kind: "regional",
  coverage: 8, playerCount: 1240, topCut: 8,
};
const STUTTGART: IrlEvent = {
  id: "ev-stg", name: "Regional de Stuttgart", date: "2026-11-08", kind: "regional",
  coverage: 8, playerCount: 980, topCut: 8,
};

const e = (
  eventId: string, placement: number | null, name: string,
  archetypeId: string | null = null, copies = 1,
): IrlEntry => ({
  eventId, placement, copies, archetypeId, archetypeName: name,
  main: name.toLowerCase().split(" ")[0], secondary: "",
});

/* ------------------------------------------------------------ agrupar -- */

test("agrupa por arquetipo y ordena por listas", () => {
  const m = irlMeta([LILLE], [
    e("ev-lille", 1, "Gardevoir ex", "a1"),
    e("ev-lille", 2, "Charizard ex", "a2"),
    e("ev-lille", 3, "Gardevoir ex", "a1"),
    e("ev-lille", 4, "Gardevoir ex", "a1"),
  ]);
  assert.equal(m.rows.length, 2);
  assert.equal(m.rows[0].name, "Gardevoir ex");
  assert.equal(m.rows[0].entries, 3);
  assert.equal(m.entries, 4);
  assert.equal(m.rows[0].share, 0.75);
});

test("el mismo mazo con y sin arquetipo del catálogo no se parte en dos filas… salvo que no haya por dónde unirlo", () => {
  // Con id en los dos sitios, una sola fila.
  const unido = irlMeta([LILLE], [
    e("ev-lille", 1, "Gardevoir ex", "a1"),
    e("ev-lille", 2, "Gardevoir ex", "a1"),
  ]);
  assert.equal(unido.rows.length, 1);

  // Sin id, la clave es el nombre normalizado: «Gardevoir EX» y «gardevoir ex»
  // siguen siendo el mismo.
  const porNombre = irlMeta([LILLE], [
    e("ev-lille", 1, "Gardevoir EX"),
    e("ev-lille", 2, "gardevoir ex"),
  ]);
  assert.equal(porNombre.rows.length, 1);
  assert.equal(porNombre.rows[0].entries, 2);
});

test("cuenta en cuántos eventos distintos sale cada mazo", () => {
  const m = irlMeta([LILLE, STUTTGART], [
    e("ev-lille", 1, "Gardevoir ex", "a1"),
    e("ev-stg", 5, "Gardevoir ex", "a1"),
    e("ev-stg", 6, "Charizard ex", "a2"),
  ]);
  assert.equal(m.rows.find((r) => r.key === "a1")?.events, 2);
  assert.equal(m.rows.find((r) => r.key === "a2")?.events, 1);
});

/* -------------------------------------------------------- conversión -- */

test("top 1, top 4 y top 8 se cuentan sobre las filas con puesto", () => {
  const m = irlMeta([LILLE], [
    e("ev-lille", 1, "Gardevoir ex", "a1"),
    e("ev-lille", 3, "Gardevoir ex", "a1"),
    e("ev-lille", 7, "Gardevoir ex", "a1"),
    e("ev-lille", 20, "Gardevoir ex", "a1"),
  ]);
  const r = m.rows[0];
  assert.equal(r.placed, 4);
  assert.equal(r.top1, 1);
  assert.equal(r.top4, 2);
  assert.equal(r.top8, 3);
  assert.equal(top4Rate(r), 0.5);
  assert.equal(top8Rate(r), 0.75);
});

test("una fila de resumen suma cuota pero no toca la conversión", () => {
  const m = irlMeta([LILLE], [
    e("ev-lille", 1, "Gardevoir ex", "a1"),
    e("ev-lille", null, "Gardevoir ex", "a1", 9),
  ]);
  const r = m.rows[0];
  assert.equal(r.entries, 10);
  assert.equal(r.placed, 1);          // solo la que tenía puesto
  assert.equal(top4Rate(r), 1);       // 1 de 1, no 1 de 10
});

test("sin ningún puesto, la conversión es null y no 0", () => {
  const m = irlMeta([LILLE], [e("ev-lille", null, "Gardevoir ex", "a1", 6)]);
  assert.equal(top4Rate(m.rows[0]), null);
  assert.equal(top8Rate(m.rows[0]), null);
});

test("el mejor puesto se queda con el más bajo, y con su evento", () => {
  const m = irlMeta([LILLE, STUTTGART], [
    e("ev-stg", 9, "Gardevoir ex", "a1"),
    e("ev-lille", 2, "Gardevoir ex", "a1"),
  ]);
  assert.deepEqual(m.rows[0].best, { placement: 2, event: "Regional de Lille" });
});

/* ------------------------------------------------------------ la foto -- */

test("la cobertura es la del evento que menos cubre", () => {
  const m = irlMeta(
    [{ ...LILLE, coverage: 32 }, { ...STUTTGART, coverage: 8 }],
    [e("ev-lille", 1, "Gardevoir ex", "a1")],
  );
  assert.equal(m.coverage, 8);
});

test("la asistencia suma, y es null si nadie la apuntó", () => {
  assert.equal(irlMeta([LILLE, STUTTGART], []).attendance, 2220);
  assert.equal(irlMeta([{ ...LILLE, playerCount: null }], []).attendance, null);
});

test("el evento más reciente es el que fecha la foto", () => {
  assert.equal(irlMeta([STUTTGART, LILLE], []).latest?.id, "ev-lille");
});

test("sin nada importado no se rompe nada", () => {
  const m = irlMeta([], []);
  assert.deepEqual(m.rows, []);
  assert.equal(m.entries, 0);
  assert.equal(m.coverage, null);
  assert.equal(m.latest, null);
  assert.equal(mejorConversion(m.rows), null);
});

test("mejorConversion no corona a un mazo con dos listas", () => {
  const rows = irlMeta([LILLE], [
    e("ev-lille", 1, "Casualidad", "a9"),
    e("ev-lille", 2, "Casualidad", "a9"),
    ...Array.from({ length: 6 }, (_, i) => e("ev-lille", i + 3, "Gardevoir ex", "a1")),
  ]).rows;
  // «Casualidad» tiene 100% de top 4 con dos listas; no cuenta.
  assert.equal(mejorConversion(rows)?.key, "a1");
});
