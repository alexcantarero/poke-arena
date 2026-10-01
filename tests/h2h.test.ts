import { test } from "node:test";
import assert from "node:assert/strict";
import { claveRonda, matrizH2H } from "../src/lib/h2h.ts";

test("una ronda apuntada por los dos lados cuenta una vez", () => {
  const m = matrizH2H([
    { clave: claveRonda("t1", 3, "ibai", "alex"), a: "ibai", b: "alex", resultado: "a" },
    { clave: claveRonda("t1", 3, "alex", "ibai"), a: "alex", b: "ibai", resultado: "b" },
  ]);
  assert.equal(m.total, 1);
  assert.deepEqual(m.celda("ibai", "alex"), { partidas: 1, gana: 1, pierde: 0, empata: 0 });
  assert.deepEqual(m.celda("alex", "ibai"), { partidas: 1, gana: 0, pierde: 1, empata: 0 });
});

test("suma partidas internas y es simétrica", () => {
  const m = matrizH2H([
    { clave: "m1", a: "ibai", b: "alex", resultado: "a" },
    { clave: "m2", a: "alex", b: "ibai", resultado: "a" },
    { clave: "m3", a: "ibai", b: "alusat", resultado: "tie" },
  ]);
  assert.equal(m.celda("ibai", "alex").partidas, 2);
  assert.equal(m.celda("ibai", "alex").gana, 1);
  assert.equal(m.celda("alex", "ibai").gana, 1);
  assert.equal(m.celda("alusat", "ibai").empata, 1);
  assert.equal(m.max, 2);
  assert.equal(m.ids[0], "ibai");
  assert.equal(m.celda("alex", "alusat").partidas, 0);
});

test("ignora encuentros contra uno mismo o sin rival", () => {
  const m = matrizH2H([{ clave: "x", a: "ibai", b: "ibai", resultado: "a" }, { clave: "y", a: "ibai", b: "", resultado: "a" }]);
  assert.equal(m.total, 0);
  assert.equal(m.ids.length, 0);
});
