import { test } from "node:test";
import assert from "node:assert/strict";
import { bloqueados, validarMazosPorJuego } from "../src/lib/juegosMazos.ts";

test("ganar con un arquetipo lo bloquea para el resto de la serie; perder no", () => {
  const j = [
    { winner: "a", archA: "dragapult", archB: "gardevoir" },
    { winner: "b", archA: "charizard", archB: "gardevoir" },
  ];
  assert.deepEqual([...bloqueados(j, 1, "a")], ["dragapult"]);
  assert.deepEqual([...bloqueados(j, 1, "b")], []);
  assert.deepEqual([...bloqueados(j, 2, "b")], ["gardevoir"]);
});

test("un empate no bloquea", () => {
  assert.equal(bloqueados([{ winner: "tie", archA: "x", archB: "y" }], 1, "a").size, 0);
});

test("repetir el mazo ganador es un error con juego y lado", () => {
  assert.deepEqual(validarMazosPorJuego([
    { winner: "a", archA: "dragapult", archB: "gardevoir" },
    { winner: "b", archA: "dragapult", archB: "lugia" },
  ]), { juego: 2, lado: "a", arch: "dragapult" });
  assert.equal(validarMazosPorJuego([
    { winner: "b", archA: "dragapult", archB: "gardevoir" },
    { winner: "a", archA: "dragapult", archB: "lugia" },
  ]), null);
});
