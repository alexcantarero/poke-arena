import { test } from "node:test";
import assert from "node:assert/strict";
import { cuotas, muestraPorPeriodos, periodoDe, tendenciaDe } from "../src/lib/metaTendencia.ts";

const ahora = Date.parse("2026-11-09T12:00:00Z");

test("periodos de 30 días hacia atrás", () => {
  assert.equal(periodoDe("2026-11-08", ahora), 0);
  assert.equal(periodoDe("2026-10-05", ahora), 1);
  assert.equal(periodoDe("2026-09-01", ahora), 2);
  assert.equal(periodoDe("2026-07-01", ahora), -1);
  assert.equal(periodoDe("no", ahora), -1);
});

test("EL FILTRO DE DÍAS: la muestra cubre los tres meses, los más grandes de cada uno", () => {
  const t = [
    { id: "a", date: "2026-11-08", players: 40 }, { id: "b", date: "2026-11-01", players: 300 },
    { id: "c", date: "2026-10-03", players: 20 }, { id: "d", date: "2026-10-01", players: 90 },
    { id: "e", date: "2026-09-02", players: 64 }, { id: "f", date: "2026-06-01", players: 900 },
  ];
  const m = muestraPorPeriodos(t, ahora, 1);
  assert.deepEqual(m.map((c) => c.map((x) => x.id)), [["b"], ["d"], ["e"]]);
});

test("cuotas suman 1", () => {
  const c = cuotas(new Map([["x", 3], ["y", 1]]));
  assert.equal(c.get("x"), 0.75);
  assert.equal(cuotas(new Map()).size, 0);
});

test("tendencia: sube, baja, estable y nuevo", () => {
  assert.equal(tendenciaDe([0.12, 0.08, 0.07]), "sube");
  assert.equal(tendenciaDe([0.04, 0.09, 0.1]), "baja");
  assert.equal(tendenciaDe([0.101, 0.1, 0.099]), "estable");
  assert.equal(tendenciaDe([0.05, null, 0]), "nuevo");
  assert.equal(tendenciaDe([0, 0.05, null]), "baja");
  assert.equal(tendenciaDe([0, null, null]), "estable");
});
