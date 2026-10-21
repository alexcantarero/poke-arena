import { test } from "node:test";
import assert from "node:assert/strict";
import { leerMarcador, marcadoresDe, secuenciaDe } from "../src/lib/marcador.ts";

test("marcadores por formato", () => {
  assert.deepEqual(marcadoresDe(1), [[1, 0], [0, 1]]);
  assert.deepEqual(marcadoresDe(3), [[2, 0], [2, 1], [1, 2], [0, 2]]);
  assert.equal(marcadoresDe(5).length, 6);
});

test("la secuencia cuadra con el marcador y el último lo gana quien gana", () => {
  for (const bo of [1, 3, 5]) for (const [a, b] of marcadoresDe(bo)) {
    const s = secuenciaDe(a, b);
    assert.equal(s.filter((x) => x === "a").length, a, `${a}-${b}`);
    assert.equal(s.filter((x) => x === "b").length, b, `${a}-${b}`);
    assert.equal(s.at(-1), a > b ? "a" : "b", `${a}-${b}`);
  }
});

test("solo valen los marcadores del formato", () => {
  assert.deepEqual(leerMarcador("2-1", 3), { a: 2, b: 1 });
  assert.equal(leerMarcador("3-0", 3), null);
  assert.equal(leerMarcador("1-1", 3), null);
  assert.equal(leerMarcador("2-0", 1), null);
  assert.equal(leerMarcador("empate", 3), "empate");
  assert.equal(leerMarcador("x", 3), null);
});
