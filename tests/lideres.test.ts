import { test } from "node:test";
import assert from "node:assert/strict";
import { lideresDe } from "../src/lib/lideres.ts";

test("cada sección tiene los suyos, también en sus subpáginas", () => {
  assert.deepEqual(lideresDe("/torneos"), ["charizard", "lucario"]);
  assert.deepEqual(lideresDe("/torneos/abc123"), ["charizard", "lucario"]);
  assert.deepEqual(lideresDe("/ranking?vista=x"), ["dragonite", "garchomp"]);
});

test("una ruta que empieza igual no se confunde (/perfiles ≠ /perfil)", () => {
  assert.deepEqual(lideresDe("/perfiles"), ["pikachu", "eevee"]);
});

test("Inicio y lo desconocido, los de Inicio", () => {
  assert.deepEqual(lideresDe("/"), ["pikachu", "eevee"]);
  assert.deepEqual(lideresDe("/otra-cosa"), ["pikachu", "eevee"]);
});
