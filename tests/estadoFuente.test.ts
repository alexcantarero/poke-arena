import { test } from "node:test";
import assert from "node:assert/strict";
import { resumenEstados, tipoDeEstado } from "../src/lib/estadoFuente.ts";

test("cada código dice una cosa distinta", () => {
  assert.equal(tipoDeEstado("200"), "ok");
  assert.equal(tipoDeEstado(403), "bloqueado");
  assert.equal(tipoDeEstado("404"), "noExiste");
  assert.equal(tipoDeEstado("red"), "red");
  assert.equal(tipoDeEstado("429"), "limite");
  assert.equal(tipoDeEstado("503"), "servidor");
});

test("el caso real del 22/10: 0 de 2 con 403 es un bloqueo, no un fichero que falta", () => {
  assert.equal(resumenEstados(["403", "403"]), "bloqueado");
  assert.equal(resumenEstados(["200", "404"]), "noExiste");
  assert.equal(resumenEstados(["200", "200"]), "ok");
});
