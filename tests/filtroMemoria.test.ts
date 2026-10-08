import { test } from "node:test";
import assert from "node:assert/strict";
import { decidirMemoria } from "../src/lib/filtroMemoria.ts";

test("al entrar sin filtros se restaura lo guardado", () => {
  assert.equal(decidirMemoria({ entrando: true, qs: "", guardado: "agrupar=1", limpiar: false }), "restaurar");
});

test("EL FALLO: dentro de Estadísticas, volver a «Vista detallada» no te devuelve a la agrupada", () => {
  assert.equal(decidirMemoria({ entrando: false, qs: "", guardado: "agrupar=1", limpiar: false }), "borrar");
});

test("EL FALLO: de «Regionales» a «Jugadores de la app» (sin parámetros) no rebota", () => {
  assert.equal(decidirMemoria({ entrando: false, qs: "", guardado: "fuente=regionales", limpiar: false }), "borrar");
});

test("con filtros en la URL se guardan; limpiar manda sobre todo", () => {
  assert.equal(decidirMemoria({ entrando: false, qs: "tipo=regional", guardado: null, limpiar: false }), "guardar");
  assert.equal(decidirMemoria({ entrando: true, qs: "tipo=regional", guardado: "x=1", limpiar: true }), "limpiar");
});
