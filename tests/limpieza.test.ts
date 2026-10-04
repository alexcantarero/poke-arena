import { test } from "node:test";
import assert from "node:assert/strict";
import { torneosAbandonados } from "../src/lib/limpieza.ts";

const ahora = new Date("2026-10-10T04:00:00Z");

test("creado hace más de 3 días, ya jugado y sin participación → se borra", () => {
  const ids = torneosAbandonados([{ id: "t1", createdAt: "2026-10-01T10:00:00Z", date: "2026-10-02" }], new Set(), ahora);
  assert.deepEqual(ids, ["t1"]);
});

test("con un resultado o una ronda no se toca", () => {
  const ids = torneosAbandonados([{ id: "t1", createdAt: "2026-10-01T10:00:00Z", date: "2026-10-02" }], new Set(["t1"]), ahora);
  assert.deepEqual(ids, []);
});

test("creado hace menos de 3 días no se toca", () => {
  const ids = torneosAbandonados([{ id: "t1", createdAt: "2026-10-08T10:00:00Z", date: "2026-10-02" }], new Set(), ahora);
  assert.deepEqual(ids, []);
});

test("un torneo futuro no se borra aunque se creara hace semanas", () => {
  const ids = torneosAbandonados([{ id: "niza", createdAt: "2026-09-01T10:00:00Z", date: "2026-10-17", endDate: "2026-10-18" }], new Set(), ahora);
  assert.deepEqual(ids, []);
});

test("regla literal: con respetarFuturos=false, el futuro también cae", () => {
  const ids = torneosAbandonados([{ id: "niza", createdAt: "2026-09-01T10:00:00Z", date: "2026-10-17" }], new Set(), ahora, { respetarFuturos: false });
  assert.deepEqual(ids, ["niza"]);
});
