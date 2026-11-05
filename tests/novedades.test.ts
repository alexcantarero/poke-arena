import { test } from "node:test";
import assert from "node:assert/strict";
import { leerVistos, nuevosDesde } from "../src/lib/novedades.ts";

test("la primera vez solo se guarda: ninguna fiesta por lo que ya tenías", () => {
  assert.deepEqual(nuevosDesde(null, ["partidas:bronze", "racha:gold"]), { nuevos: [], guardar: ["partidas:bronze", "racha:gold"] });
});

test("lo nuevo es lo que no estaba; subir de bronce a plata es nuevo", () => {
  const r = nuevosDesde(["partidas:bronze"], ["partidas:silver", "torneos:bronze"]);
  assert.deepEqual(r.nuevos, ["partidas:silver", "torneos:bronze"]);
  assert.deepEqual(nuevosDesde(["a", "b"], ["b", "a"]).nuevos, []);
});

test("lo guardado roto o raro cuenta como nada guardado", () => {
  assert.equal(leerVistos(null), null);
  assert.equal(leerVistos("{"), null);
  assert.equal(leerVistos("[1,2]"), null);
  assert.deepEqual(leerVistos('["x"]'), ["x"]);
});
