import { test } from "node:test";
import assert from "node:assert/strict";
import { coloresDistintos, distanciaColor, PALETA_SERIES, UMBRAL_COLOR } from "../src/lib/coloresSeries.ts";

test("EL CASO DEL 4/11: dos rosas y dos verdes azulados dejan de coincidir", () => {
  const c = coloresDistintos([
    { id: "rol", color: "#e987b8" }, { id: "niccolo", color: "#e48ab5" },
    { id: "cristina", color: "#5c9ea8" }, { id: "ibai", color: "#5fa3ab" },
  ]);
  assert.equal(c.get("rol"), "#e987b8");       // el primero conserva el suyo
  assert.equal(c.get("cristina"), "#5c9ea8");
  assert.notEqual(c.get("niccolo"), "#e48ab5"); // el que choca, cambia
  assert.notEqual(c.get("ibai"), "#5fa3ab");
  const todos = [...c.values()];
  for (let i = 0; i < todos.length; i++) for (let j = i + 1; j < todos.length; j++) {
    assert.ok(distanciaColor(todos[i], todos[j]) >= UMBRAL_COLOR, `${todos[i]} vs ${todos[j]}`);
  }
});

test("colores ya distintos no se tocan; sin color, toma de la paleta", () => {
  const c = coloresDistintos([{ id: "a", color: "#ff0000" }, { id: "b", color: "#0000ff" }, { id: "c" }]);
  assert.equal(c.get("a"), "#ff0000");
  assert.equal(c.get("b"), "#0000ff");
  assert.ok(PALETA_SERIES.includes(c.get("c")!));
});

test("variables CSS: iguales solo si es el mismo texto", () => {
  assert.equal(distanciaColor("var(--series-1)", "var(--series-1)"), 0);
  assert.equal(distanciaColor("var(--series-1)", "var(--series-2)"), Infinity);
  const c = coloresDistintos([{ id: "a", color: "var(--series-1)" }, { id: "b", color: "var(--series-1)" }]);
  assert.notEqual(c.get("a"), c.get("b"));
});

test("con más series que colores, nunca se queda alguna sin color", () => {
  const muchas = Array.from({ length: 16 }, (_, i) => ({ id: `p${i}`, color: "#3987e5" }));
  const c = coloresDistintos(muchas);
  assert.equal(c.size, 16);
  for (const v of c.values()) assert.ok(v);
});
