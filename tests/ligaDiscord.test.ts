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
