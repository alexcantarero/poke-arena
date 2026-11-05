import { test } from "node:test";
import assert from "node:assert/strict";
import { hrefConParam, ordenarCruce, parseCruce, resumenCruce, valorCruce } from "../src/lib/cruces.ts";

test("parseCruce: válido, y basura fuera", () => {
  assert.deepEqual(parseCruce("p1~p2"), ["p1", "p2"]);
  assert.deepEqual(parseCruce(["arch:dragapult~arch:gardevoir"]), ["arch:dragapult", "arch:gardevoir"]);
  assert.equal(parseCruce("p1~p1"), null);
  assert.equal(parseCruce("p1"), null);
  assert.equal(parseCruce("a~b~c"), null);
  assert.equal(parseCruce("<script>~b"), null);
  assert.equal(parseCruce(undefined), null);
  assert.equal(valorCruce("a", "b"), "a~b");
});

test("hrefConParam conserva los filtros y cambia solo el suyo", () => {
  const q = { ambito: "liga", fecha: "temporada", cruce: "x~y", vacio: undefined };
  assert.equal(hrefConParam("/ranking", q, "cruce", "a~b", "cruce"), "/ranking?ambito=liga&fecha=temporada&cruce=a%7Eb#cruce");
  assert.equal(hrefConParam("/ranking", q, "cruce", null), "/ranking?ambito=liga&fecha=temporada");
  assert.equal(hrefConParam("/ranking", {}, "cruce", null), "/ranking");
  assert.equal(hrefConParam("/x", { t: ["1", "2"] }, "c", "v"), "/x?t=1&t=2&c=v");
});

test("resumen y orden del cruce", () => {
  const ps = [
    { id: "1", fecha: "2026-10-01", contexto: "", resultado: "w" as const, marcador: "" },
    { id: "2", fecha: "2026-10-05", contexto: "", resultado: "l" as const, marcador: "" },
    { id: "3", fecha: "2026-10-05", contexto: "", resultado: null, marcador: "" },
  ];
  assert.deepEqual(resumenCruce(ps), { w: 1, l: 1, t: 0, total: 3 });
  assert.deepEqual(ordenarCruce(ps).map((p) => p.id), ["2", "3", "1"]);
});
