import { test } from "node:test";
import assert from "node:assert/strict";
import { embedAgenda, embedPendientes, embedTorneo, esLunesEnMadrid, semanaDe } from "../src/lib/discordMensajes.ts";

const URL = "https://app.example";
const R = (jugador: string, puesto: number | null, extra = {}) =>
  ({ jugador, puesto, mazo: "Dragapult", wins: 5, losses: 1, ties: 0, drop: false, ...extra });

test("torneo: por puesto, con medalla los del corte, y enlace a su ficha", () => {
  const e = embedTorneo({ id: "t1", nombre: "Cup Kanto", fecha: "2026-10-20", jugadores: 40, topCut: 8 },
    [R("Alex", 12), R("Ibai", 3), R("Javi", null)], URL);
  assert.equal(e.url, "https://app.example/torneos/t1");
  assert.equal(e.color, 0xfacc15);
  const lineas = e.description!.split("\n");
  assert.match(lineas[0], /🥉 \*\*#3\*\* Ibai · Dragapult · 5-1/);
  assert.match(lineas[1], /▫️ \*\*#12\*\* Alex/);   // fuera del top 8: sin medalla
  assert.match(lineas[2], /— Javi/);               // sin puesto: al final
  assert.ok(e.fields!.some((f) => f.name === "En el top 8" && f.value === "1"));
});

test("pendientes: agrupadas por liga y por jornada; sin pendientes, sin mensaje", () => {
  assert.equal(embedPendientes([], URL), null);
  const e = embedPendientes([
    { liga: "Liga Invierno", jornada: 4, a: "Ibai", b: "Alex" },
    { liga: "Liga Invierno", jornada: 3, a: "Javi", b: "Rol" },
  ], URL)!;
  assert.match(e.title, /^⏳ 2 partidas/);
  assert.ok(e.description!.indexOf("J3") < e.description!.indexOf("J4"));
});

test("agenda: en orden, con fechas cortas y enlaces", () => {
  const e = embedAgenda({ desde: "2026-10-19", hasta: "2026-10-25" }, [
    { fecha: "2026-10-24", fin: "2026-10-25", titulo: "Regional", lugar: "Lisboa", url: "https://x" },
    { fecha: "2026-10-21", fin: null, titulo: "Challenge", lugar: null, url: null },
  ], URL)!;
  const lineas = e.description!.split("\n");
  assert.match(lineas[0], /mié 21.*Challenge/);
  assert.match(lineas[1], /sáb 24–dom 25.*\[Regional\]\(https:\/\/x\) · Lisboa/);
  assert.equal(embedAgenda({ desde: "a", hasta: "b" }, [], URL), null);
});

test("la semana va de lunes a domingo", () => {
  assert.deepEqual(semanaDe("2026-10-22"), { desde: "2026-10-19", hasta: "2026-10-25" }); // jueves
  assert.deepEqual(semanaDe("2026-10-19"), { desde: "2026-10-19", hasta: "2026-10-25" }); // lunes
  assert.deepEqual(semanaDe("2026-10-25"), { desde: "2026-10-19", hasta: "2026-10-25" }); // domingo
});

test("el cron de las 04:00 UTC del lunes ya es lunes en Madrid", () => {
  assert.equal(esLunesEnMadrid(new Date("2026-10-19T04:00:00Z")), true);
  assert.equal(esLunesEnMadrid(new Date("2026-10-18T21:00:00Z")), false); // domingo noche
});
