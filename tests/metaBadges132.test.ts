import { test } from "node:test";
import assert from "node:assert/strict";
import { insigniasDe, type FilaMeta } from "../src/lib/metaBadges.ts";

const f = (o: Partial<FilaMeta>): FilaMeta => ({ key: o.name ?? "x", name: "x", field: 10, day2: null, cut: 0, bestFinish: null, onlineShare: null, ...o });
const campo = { decks: 324, day2: null, topCut: 8 };

test("EL CASO DE GDANSK: Honchkrow y Greninja en el top 8 con un puñado de listas son la sorpresa; Dragapult, no", () => {
  const ins = insigniasDe([
    f({ name: "Dragapult ex", field: 58, cut: 3, bestFinish: 3 }),
    f({ name: "Rocket's Honchkrow", field: 3, cut: 1, bestFinish: 2 }),
    f({ name: "Greninja", field: 2, cut: 1, bestFinish: 6 }),
    f({ name: "Slowking", field: 20, cut: 1, bestFinish: 1 }), // ganó, pero lo llevaba el 6 %: no es una sorpresa
    f({ name: "Rareza sin corte", field: 1, cut: 0 }),
  ], campo);
  assert.equal(ins.sorpresa?.fila.name, "Rocket's Honchkrow"); // el mejor puesto de los raros
  assert.ok(Math.abs(ins.sorpresa!.valor - 3 / 324) < 1e-9);
  assert.equal(ins.espejo?.fila.name, "Dragapult ex");
});

test("a igual puesto gana el más raro; sin nadie raro en el corte no hay sorpresa", () => {
  const dos = insigniasDe([f({ name: "A", field: 5, cut: 1, bestFinish: 4 }), f({ name: "B", field: 2, cut: 1, bestFinish: 4 })], campo);
  assert.equal(dos.sorpresa?.fila.name, "B");
  assert.equal(insigniasDe([f({ name: "Dragapult ex", field: 58, cut: 3, bestFinish: 1 })], campo).sorpresa, null);
  assert.equal(insigniasDe([f({ name: "A", field: 2, cut: 1 })], { decks: 0, day2: null, topCut: 8 }).sorpresa, null);
});
