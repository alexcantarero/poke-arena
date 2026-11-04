import { test } from "node:test";
import assert from "node:assert/strict";
import {
  actividadPorDia, actividadPorHora, estadoDe, estimarUso, GB, horasActivasPorDia, leerCifra, LIMITES,
  proyectarPeriodo, resumenDespliegues, serieDelPeriodo, SUPUESTOS,
} from "../src/lib/usoLimites.ts";

test("estimación para un grupo de 20 con 8 h de actividad al día", () => {
  const r = estimarUso({ activos30: 20, horasActivasDia: 8, bytesBase: 50 * 1024 ** 2, bytesCarga: 300 * 1024 });
  const de = (k: keyof typeof LIMITES) => r.filas.find((f) => f.clave === k)!;
  assert.equal(de("invocaciones").usado, 20 * SUPUESTOS.paginasPorPersonaDia * 30 * 1.5);
  assert.ok(Math.abs(de("cpuHoras").usado - (12000 * 0.1) / 3600) < 1e-9);
  // 18.000 ejecuciones × 0,4 s × 2 GB = 14.400 GB-s = 4 GB-hora
  assert.ok(Math.abs(de("memoriaGBh").usado - 4) < 1e-9);
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

test("v0.95 — el almacenamiento real de Neon (ramas) manda sobre pg_database_size, y el límite es 1 GB", () => {
  assert.equal(LIMITES.almacenGB, 1);
  const r = estimarUso({ activos30: 5, horasActivasDia: 2, bytesBase: 900 * GB, bytesCarga: 0, neon: { almacenGB: 0.25 } });
  const a = r.filas.find((f) => f.clave === "almacenGB")!;
  assert.equal(a.usado, 0.25); assert.equal(a.real, true); assert.equal(a.pct, 0.25);
});

test("v0.95 — lo apuntado del panel de Vercel manda y cuenta como real", () => {
  const r = estimarUso({ activos30: 20, horasActivasDia: 8, bytesBase: 0, bytesCarga: 0, vercel: { invocaciones: 250_000, cpuHoras: null } });
  const inv = r.filas.find((f) => f.clave === "invocaciones")!;
  assert.equal(inv.usado, 250_000); assert.equal(inv.real, true);
  assert.equal(r.filas.find((f) => f.clave === "cpuHoras")!.real, false);
  // 20 activos con 250.000 → cabrían 80 antes del millón (si la CPU estimada no corta antes)
  assert.ok(r.maxActivos! <= 80);
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

test("actividad por día: hora de Madrid, días vacíos a cero y gente distinta", () => {
  const ahora = new Date("2026-11-04T12:00:00Z");
  const s = actividadPorDia([
    { t: new Date("2026-11-03T23:30:00Z"), quien: "a" }, // 00:30 del 4 en Madrid
    { t: new Date("2026-11-04T10:00:00Z"), quien: "a" },
    { t: new Date("2026-11-04T11:00:00Z"), quien: "b" },
    { t: new Date("2026-11-02T10:00:00Z"), quien: null },
    { t: new Date("2026-10-01T10:00:00Z"), quien: "c" }, // fuera
  ], 7, ahora);
  assert.equal(s.length, 7);
  assert.equal(s.at(-1)!.dia, "2026-11-04");
  assert.deepEqual(s.at(-1), { dia: "2026-11-04", n: 3, personas: 2 });
  assert.deepEqual(s.at(-3), { dia: "2026-11-02", n: 1, personas: 0 });
  assert.equal(s.at(-2)!.n, 0);
});

test("actividad por hora en Madrid (invierno: UTC+1)", () => {
  const ahora = new Date("2026-11-04T23:00:00Z");
  const h = actividadPorHora([new Date("2026-11-04T19:15:00Z"), new Date("2026-11-04T19:45:00Z"), new Date("2026-11-04T07:00:00Z")], 30, ahora);
  assert.equal(h.length, 24);
  assert.equal(h[20], 2); assert.equal(h[8], 1);
  assert.equal(h.reduce((a, b) => a + b, 0), 3);
});

test("proyección a fin de periodo", () => {
  const inicio = new Date("2026-11-01T00:00:00Z");
  const p = proyectarPeriodo(20, inicio, new Date("2026-11-11T00:00:00Z"), 30)!;
  assert.equal(p.transcurridos, 10); assert.equal(p.proyeccion, 60); assert.equal(p.quedan, 20);
  assert.equal(proyectarPeriodo(5, inicio, new Date("2026-11-01T10:00:00Z")), null); // menos de un día
  assert.equal(proyectarPeriodo(5, null), null);
});

test("serie del periodo: si el valor baja, empezó un periodo nuevo", () => {
  const L = (fecha: string, cu: number) => ({ fecha, fuente: "neon", datos: { cuHoras: cu } });
  const s = serieDelPeriodo([L("2026-10-30", 80), L("2026-10-29", 70), L("2026-11-01", 1), L("2026-11-02", 3),
    { fecha: "2026-11-02", fuente: "vercel", datos: { cuHoras: 999 } }], "neon", "cuHoras");
  assert.deepEqual(s, [{ fecha: "2026-11-01", valor: 1 }, { fecha: "2026-11-02", valor: 3 }]);
});

test("leer cifras copiadas del panel de Vercel", () => {
  assert.equal(leerCifra("12.345", true), 12345);
  assert.equal(leerCifra("12,345", true), 12345);
  assert.equal(leerCifra("1.234.567", true), 1234567);
  assert.equal(leerCifra("1.2K", true), 1200);
  assert.equal(leerCifra("3,4 M", true), 3_400_000);
  assert.equal(leerCifra("1,5"), 1.5);
  assert.equal(leerCifra("1,125"), 1.125); // en horas, decimal
  assert.equal(leerCifra("0.75 h"), 0.75);
  assert.equal(leerCifra("12 GB-Hrs"), 12);
  assert.equal(leerCifra("1.234,5"), 1234.5);
  assert.equal(leerCifra("abc"), null);
  assert.equal(leerCifra(""), null);
});

test("resumen de despliegues: sin autores, solo estados y tiempos", () => {
  const ahora = new Date("2026-11-04T12:00:00Z");
  const t = ahora.getTime();
  const r = resumenDespliegues([
    { creado: t - 86_400_000, empiezaBuild: t - 86_400_000, listo: t - 86_400_000 + 60_000, estado: "READY", produccion: true },
    { creado: t - 2 * 86_400_000, empiezaBuild: t - 2 * 86_400_000, listo: t - 2 * 86_400_000 + 120_000, estado: "READY", produccion: false },
    { creado: t - 3 * 86_400_000, estado: "ERROR", produccion: false },
    { creado: t - 60 * 86_400_000, estado: "READY", produccion: true }, // fuera de los 30 días
  ], ahora);
  assert.equal(r.total, 3); assert.equal(r.produccion, 1); assert.equal(r.fallidos, 1);
  assert.equal(r.buildMedioSeg, 90);
  assert.equal(r.ultimo, t - 86_400_000);
});
