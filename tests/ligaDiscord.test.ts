import { test } from "node:test";
import assert from "node:assert/strict";
import { embedLiga } from "../src/lib/discordMensajes.ts";

test("aviso de inscripción con enlace directo a apuntarse", () => {
  const e = embedLiga({ tipo: "inscripcion", nombre: "Season 1", inicio: "2026-11-23", maxPorDivision: 6 }, "https://arena.test");
  assert.equal(e.url, "https://arena.test/divisiones");
  assert.match(e.description!, /Season 1/);
  assert.match(e.description!, /arena\.test\/divisiones/);
});

test("final de temporada: campeón y movimientos, sin divisiones vacías", () => {
  const e = embedLiga({
    tipo: "cierre", nombre: "Season 1", campeon: "Ibai",
    divisiones: [{ nivel: 1, suben: [], bajan: ["Alex", "Rol"] }, { nivel: 2, suben: ["Lauty", "Cris"], bajan: [] }, { nivel: 3, suben: [], bajan: [] }],
  }, "https://arena.test");
  assert.match(e.description!, /Ibai/);
  assert.match(e.description!, /División 1.*Alex, Rol/);
  assert.ok(!/División 3/.test(e.description!));
});

import { conEspera, embedEnfrentamiento, nombreHilo, urlHilo } from "../src/lib/discordMensajes.ts";
import { divisionesAlcanzadas } from "../src/lib/divisionElo.ts";

const enf = { matchId: "m1", temporada: "Season 1", division: 2, jornada: 3, fecha: "2026-11-30", a: "Ibai", b: "Alex", bestOf: 3 };

test("post del foro: nombre corto y legible, enlace a la partida", () => {
  assert.equal(nombreHilo(enf), "J3 · Ibai vs Alex · División 2");
  assert.ok(nombreHilo({ ...enf, a: "x".repeat(120) }).length <= 100);
  assert.equal(embedEnfrentamiento(enf, "https://arena.test").url, "https://arena.test/partidas/m1");
});

test("webhook con wait=true, tenga o no ya parámetros", () => {
  assert.equal(conEspera("https://discord.com/api/webhooks/1/abc"), "https://discord.com/api/webhooks/1/abc?wait=true");
  assert.equal(conEspera("https://discord.com/api/webhooks/1/abc?x=1"), "https://discord.com/api/webhooks/1/abc?x=1&wait=true");
});

test("enlace al hilo solo con un id de servidor válido", () => {
  assert.equal(urlHilo("123", "456"), "https://discord.com/channels/123/456");
  assert.equal(urlHilo(undefined, "456"), null);
  assert.equal(urlHilo("abc", "456"), null);
});

test("celebrar al subir: divisiones alcanzadas hasta la actual, Novato no cuenta", () => {
  assert.deepEqual(divisionesAlcanzadas("novato"), []);
  assert.deepEqual(divisionesAlcanzadas("plata"), ["hierro", "bronce", "plata"]);
  assert.equal(divisionesAlcanzadas("challenger").length, 10); // v0.122: con Esmeralda
});
