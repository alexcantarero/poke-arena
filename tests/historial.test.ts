import { test } from "node:test";
import assert from "node:assert/strict";
import { porRecientes } from "../src/lib/stats.ts";

const m = (id: string, date: string, round: number, createdAt?: string) => ({ id, date, round, createdAt });

test("EL FALLO QUE ESTO CORRIGE: mismo día, R4-R3-R2-R1 y no R3-R2-R1-R4", () => {
  const filas = [m("a", "2026-09-30", 3), m("b", "2026-09-30", 2), m("c", "2026-09-30", 1), m("d", "2026-09-30", 4)];
  assert.deepEqual(filas.sort(porRecientes).map((x) => x.round), [4, 3, 2, 1]);
});

test("primero por fecha, más reciente arriba", () => {
  const filas = [m("a", "2026-09-19", 5), m("b", "2026-09-30", 1), m("c", "2026-09-12", 2)];
  assert.deepEqual(filas.sort(porRecientes).map((x) => x.id), ["b", "a", "c"]);
});

test("a igual fecha y ronda (amistosos), la creada más tarde primero", () => {
  const filas = [m("a", "2026-10-01", 0, "2026-10-01T10:00:00Z"), m("b", "2026-10-01", 0, "2026-10-01T18:00:00Z")];
  assert.deepEqual(filas.sort(porRecientes).map((x) => x.id), ["b", "a"]);
});
