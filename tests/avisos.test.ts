import { test } from "node:test";
import assert from "node:assert/strict";
import { avisosDe, type EstadoAvisos } from "../src/lib/avisos.ts";

const base: EstadoAvisos = { playerId: "p1", torneosSinResultado: [], pendientesLiga: 0, resetLadder: false, ladderToca: false, inscripcion: null, faltaNick: false };

test("sin nada pendiente no hay avisos", () => {
  assert.deepEqual(avisosDe(base), []);
});

test("el orden: resultados olvidados, liga, ladder, inscripción y nick", () => {
  const a = avisosDe({
    ...base, pendientesLiga: 2, ladderToca: true, faltaNick: true, inscripcion: { id: "t2", nombre: "Invierno" },
    torneosSinResultado: [{ id: "a", nombre: "Cup vieja", fecha: "2026-10-01" }, { id: "b", nombre: "Cup nueva", fecha: "2026-11-14" }],
  });
  assert.deepEqual(a.map((x) => x.id), ["resultado:b", "resultado:a", "liga", "ladder", "inscripcion:t2", "nick"]);
  assert.deepEqual([a[0].href, a[0].nombre, a[2].n, a[3].href], ["/torneos/b", "Cup nueva", 2, "/perfil/p1#ladder"]);
});

test("con un reset reciente sale el reset y no, además, el recordatorio del ladder", () => {
  assert.deepEqual(avisosDe({ ...base, resetLadder: true, ladderToca: true }).map((x) => x.tipo), ["reset"]);
});

test("como mucho cinco torneos olvidados, los más recientes", () => {
  const ts = Array.from({ length: 8 }, (_, i) => ({ id: `t${i}`, nombre: `T${i}`, fecha: `2026-10-0${i + 1}` }));
  assert.deepEqual(avisosDe({ ...base, torneosSinResultado: ts }).map((x) => x.id), ["resultado:t7", "resultado:t6", "resultado:t5", "resultado:t4", "resultado:t3"]);
});
