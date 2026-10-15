import { test } from "node:test";
import assert from "node:assert/strict";
import { escalaRobusta, percentil } from "../src/lib/escala.ts";

test("percentil: casos de libro", () => {
  assert.equal(percentil([1, 2, 3, 4, 5], 0.5), 3);
  assert.equal(percentil([1, 2, 3, 4, 5], 1), 5);
  assert.equal(percentil([1, 2, 3, 4, 5], 0), 1);
  assert.equal(percentil([], 0.9), 0);
});

test("EL CASO DE LA CAPTURA: media de 2,7 y un día con 90 se recorta", () => {
  // Treinta días normales y uno disparado: sin recortar, los otros 29 se
  // quedan pegados al suelo y la gráfica solo enseña el pico.
  const dias = [2, 3, 1, 4, 2, 0, 3, 5, 2, 1, 3, 2, 4, 0, 90, 2, 3, 1, 2, 4, 3, 2, 1, 0, 2, 3, 4, 2, 1, 0];
  const e = escalaRobusta(dias);
  assert.ok(e.techo !== null, "debería recortar");
  assert.ok(e.techo! < 20, `el techo ${e.techo} sigue dejando los días normales aplastados`);
  assert.deepEqual(e.fuera, [14], "el único fuera de escala es el día 14");
});

test("sin valores atípicos no se toca nada", () => {
  const e = escalaRobusta([2, 3, 1, 4, 2, 0, 3, 5, 2, 1, 6, 2]);
  assert.equal(e.techo, null);
  assert.deepEqual(e.fuera, []);
});

test("un tres entre ceros y unos NO es atípico", () => {
  // Sin el mínimo absoluto, esto se recortaría y no tiene sentido.
  const e = escalaRobusta([0, 1, 0, 0, 1, 3, 0, 1, 0, 0]);
  assert.equal(e.techo, null);
});

test("pocas muestras: no se recorta nada", () => {
  assert.equal(escalaRobusta([1, 50, 2]).techo, null);
});

test("varios días disparados salen todos en la lista", () => {
  const dias = [1, 2, 1, 80, 2, 1, 2, 75, 1, 2, 1, 2];
  assert.deepEqual(escalaRobusta(dias).fuera, [3, 7]);
});
