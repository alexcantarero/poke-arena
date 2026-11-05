import { test } from "node:test";
import assert from "node:assert/strict";
import { clasificacionDirecto, enDirecto, recordTexto } from "../src/lib/enDirecto.ts";

test("en directo: abierto y hoy entre el primer día y el día siguiente al último", () => {
  const reg = { status: "open", date: "2026-11-28", endDate: "2026-11-29" };
  assert.equal(enDirecto(reg, "2026-11-27"), false);
  assert.equal(enDirecto(reg, "2026-11-28"), true);
  assert.equal(enDirecto(reg, "2026-11-29"), true);
  assert.equal(enDirecto(reg, "2026-11-30"), true); // el top cut se apunta tarde
  assert.equal(enDirecto(reg, "2026-12-01"), false);
  assert.equal(enDirecto({ ...reg, status: "closed" }, "2026-11-28"), false);
  assert.equal(enDirecto({ status: "open", date: "2026-11-07", endDate: null }, "2026-11-07"), true);
});

test("clasificación del grupo: puntos, menos derrotas, más jugadas; el drop al final", () => {
  const c = clasificacionDirecto([
    { playerId: "ana", rondas: ["w", "w", "l", null] },     // 6 pts, 1 D
    { playerId: "bea", rondas: ["w", "t", "w"] },           // 7 pts
    { playerId: "carl", rondas: ["w", "w", "w"], dropped: true },
    { playerId: "dani", rondas: ["w", "l", "w"] },          // 6 pts, 1 D, 3 jugadas
  ]);
  assert.deepEqual(c.map((x) => x.playerId), ["bea", "ana", "dani", "carl"]);
  assert.equal(c[0].puntos, 7);
  assert.equal(c[1].puesto, 2);
  assert.equal(c[2].puesto, 2); // ana y dani: mismos puntos, derrotas y jugadas
  assert.equal(c[3].puesto, 4);
  assert.equal(c[1].ultima, 4);
  assert.equal(recordTexto(c[0]), "2-0-1 · 7 pts");
});
