import { test } from "node:test";
import assert from "node:assert/strict";
import { COLUMNAS_NUEVAS_PLAYERS, ESQUEMA_ESPERADO, esColumnaQueFalta, faltantes, sinClaves } from "../src/lib/esquemaEsperado.ts";

const TODO = ESQUEMA_ESPERADO.map((r) => `${r.tabla}.${r.columna}`);

test("con todo migrado no falta nada", () => {
  assert.deepEqual(faltantes(TODO), []);
});

test("EL CASO DEL 4/11: sin la 0028 en producción, se dice qué migración falta", () => {
  const f = faltantes(TODO.filter((c) => c !== "players.profile_title"));
  assert.deepEqual(f, [{ migracion: "drizzle/0028_v0_94_0.sql", version: "0.94", que: ["players.profile_title"] }]);
});

test("una tabla que falta se nombra como tabla, y sin distinguir mayúsculas", () => {
  const f = faltantes(TODO.filter((c) => c !== "uso_lecturas.id").map((c) => c.toUpperCase()));
  assert.deepEqual(f.map((x) => x.que), [["tabla uso_lecturas"]]);
});

test("reconoce el 42703 de Postgres, directo, envuelto o por el texto", () => {
  assert.equal(esColumnaQueFalta({ code: "42703" }), true);
  assert.equal(esColumnaQueFalta({ message: "Failed query", cause: { code: "42703" } }), true);
  assert.equal(esColumnaQueFalta(new Error('column "profile_title" does not exist')), true);
  assert.equal(esColumnaQueFalta({ code: "42P01" }), false); // tabla que falta: otro caso
  assert.equal(esColumnaQueFalta(new Error("timeout")), false);
  assert.equal(esColumnaQueFalta(null), false);
});

test("sinClaves quita las columnas nuevas de un select", () => {
  const cols = { id: 1, name: 2, profileTitle: 3 };
  assert.deepEqual(sinClaves(cols, Object.keys(COLUMNAS_NUEVAS_PLAYERS)), { id: 1, name: 2 });
});

test("toda columna nueva de players está también en lo esperado", () => {
  // profileTitle → profile_title
  for (const k of Object.keys(COLUMNAS_NUEVAS_PLAYERS)) {
    const sql = k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    assert.ok(ESQUEMA_ESPERADO.some((r) => r.tabla === "players" && r.columna === sql), k);
  }
});
