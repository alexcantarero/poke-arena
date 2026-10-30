import { test } from "node:test";
import assert from "node:assert/strict";
import { estadoDe, estimarUso, horasActivasPorDia, LIMITES, SUPUESTOS } from "../src/lib/usoLimites.ts";

test("estimación para un grupo de 20 con 8 h de actividad al día", () => {
  const r = estimarUso({ activos30: 20, horasActivasDia: 8, bytesBase: 50 * 1024 ** 2, bytesCarga: 300 * 1024 });
  const de = (k: keyof typeof LIMITES) => r.filas.find((f) => f.clave === k)!;
  assert.equal(de("invocaciones").usado, 20 * SUPUESTOS.paginasPorPersonaDia * 30 * 1.5);
  assert.ok(Math.abs(de("cpuHoras").usado - (12000 * 0.1) / 3600) < 1e-9);
  assert.ok(de("cuHoras").usado > 60 && de("cuHoras").usado < 70); // 8 h × 30 × 0,25 × (1 + 5/60)
  assert.equal(de("almacenGB").real, true);
  assert.ok(r.maxActivos! > 100);
});

test("lo real de Neon manda sobre la estimación", () => {
  const r = estimarUso({ activos30: 5, horasActivasDia: 2, bytesBase: null, bytesCarga: 0, neon: { cuHoras: 95, transferGB: 1 } });
  const cu = r.filas.find((f) => f.clave === "cuHoras")!;
  assert.equal(cu.usado, 95); assert.equal(cu.real, true); assert.equal(cu.estado, "riesgo");
  assert.equal(r.filas.find((f) => f.clave === "almacenGB")!.real, false);
});

test("estados y horas activas", () => {
  assert.equal(estadoDe(0.3), "ok"); assert.equal(estadoDe(0.7), "aviso"); assert.equal(estadoDe(0.95), "riesgo");
  const ahora = new Date("2026-10-30T12:00:00Z");
  const h = horasActivasPorDia([
    new Date("2026-10-29T10:05:00Z"), new Date("2026-10-29T10:40:00Z"), // misma hora: cuenta 1
    new Date("2026-10-29T11:00:00Z"), new Date("2026-09-01T10:00:00Z"), // la de septiembre, fuera
  ], 14, ahora);
  assert.ok(Math.abs(h - 2 / 14) < 1e-9);
});
