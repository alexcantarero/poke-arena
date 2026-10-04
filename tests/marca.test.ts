import { test } from "node:test";
import assert from "node:assert/strict";
import { subtituloLiga } from "../src/lib/marca.ts";

test("quita la marca repetida y el separador", () => {
  assert.equal(subtituloLiga("Season 1 - PokeArena"), "Season 1");
  assert.equal(subtituloLiga("PokeArena TCG · Season 2"), "Season 2");
  assert.equal(subtituloLiga("SEASON 1 - POKEARENA"), "SEASON 1");
});

test("si no queda nada, usa el respaldo", () => {
  assert.equal(subtituloLiga("PokeArena", "Temporada 1"), "Temporada 1");
});

test("un nombre sin marca no se toca", () => {
  assert.equal(subtituloLiga("Liga de los martes"), "Liga de los martes");
});
