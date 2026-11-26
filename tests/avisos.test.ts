import { test } from "node:test";
import assert from "node:assert/strict";
import { avisosDe, esCuentaNueva, type EstadoAvisos } from "../src/lib/avisos.ts";

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
  assert.equal(a[5].href, "/perfil/editar#limitlessHandle");
  assert.deepEqual([a[0].href, a[0].nombre, a[2].n, a[3].href], ["/torneos/b", "Cup nueva", 2, "/perfil/p1#ladder"]);
});

test("con un reset reciente sale el reset y no, además, el recordatorio del ladder", () => {
  assert.deepEqual(avisosDe({ ...base, resetLadder: true, ladderToca: true }).map((x) => x.tipo), ["reset"]);
});

test("como mucho cinco torneos olvidados, los más recientes", () => {
  const ts = Array.from({ length: 8 }, (_, i) => ({ id: `t${i}`, nombre: `T${i}`, fecha: `2026-10-0${i + 1}` }));
  assert.deepEqual(avisosDe({ ...base, torneosSinResultado: ts }).map((x) => x.id), ["resultado:t7", "resultado:t6", "resultado:t5", "resultado:t4", "resultado:t3"]);
});

test("v0.135 — una cuenta nueva: lo primero, completar el perfil (nick, Play! Pokémon y ladder)", () => {
  const a = avisosDe({ ...base, cuentaNueva: true, faltaNick: true, faltaOficial: true, ladderToca: true, pendientesLiga: 1 });
  assert.deepEqual(a.map((x) => x.tipo), ["nick", "oficial", "ladder", "liga"]);
  assert.equal(a[1].href, "/perfil/p1#mundial");
  // En una cuenta antigua, lo del perfil va al final.
  const b = avisosDe({ ...base, faltaNick: true, faltaOficial: true, ladderToca: true, pendientesLiga: 1 });
  assert.deepEqual(b.map((x) => x.tipo), ["liga", "ladder", "nick", "oficial"]);
});

test("v0.135 — cuenta nueva: las dos primeras semanas desde el alta", () => {
  const ahora = Date.parse("2026-11-24T12:00:00Z");
  assert.equal(esCuentaNueva("2026-11-20", ahora), true);
  assert.equal(esCuentaNueva("2026-11-01", ahora), false);
  assert.equal(esCuentaNueva(null, ahora), false);
  assert.equal(esCuentaNueva(new Date("2026-11-24T08:00:00Z"), ahora), true);
});

test("v0.136 — el torneo al que vas, el próximo de liga con su rival y el Regional nuevo", () => {
  const a = avisosDe({
    ...base, pendientesLiga: 2, proximoLiga: { rival: "Alex" },
    torneosProximos: [{ id: "t9", nombre: "Cup Mythic", fecha: "2026-11-29" }, { id: "t8", nombre: "Cup Lorcanos", fecha: "2026-11-28" }],
    regionalNuevo: { nombre: "Regional Stuttgart", fecha: "2026-11-29" },
  });
  assert.deepEqual(a.map((x) => x.id), ["torneo:t8", "torneo:t9", "liga", "regional:2026-11-29"]);
  assert.equal(a[0].href, "/torneos/t8/preparacion");
  assert.equal(a[2].nombre, "Alex");
});
