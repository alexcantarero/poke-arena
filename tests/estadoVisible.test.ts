import { test } from "node:test";
import assert from "node:assert/strict";
import { estadoVisible, filtrarTorneos } from "../src/lib/torneosLista.ts";

test("v0.89: Borrador hasta su fecha, En curso desde ese día, Cerrado al cerrarse", () => {
  const hoy = "2026-11-03";
  assert.equal(estadoVisible({ status: "draft", date: "2026-11-10" }, hoy), "draft");
  assert.equal(estadoVisible({ status: "open", date: "2026-11-10" }, hoy), "draft");   // abierto pero futuro
  assert.equal(estadoVisible({ status: "draft", date: "2026-11-03" }, hoy), "open");   // ha llegado el día
  assert.equal(estadoVisible({ status: "open", date: "2026-10-30" }, hoy), "open");
  assert.equal(estadoVisible({ status: "closed", date: "2026-11-10" }, hoy), "closed");
  const ts = [{ id: "a", date: "2026-11-01", kind: "x", status: "open" }, { id: "b", date: "2026-11-20", kind: "x", status: "open" }];
  assert.deepEqual(filtrarTorneos(ts, { estado: "open", hoy }).map((t) => t.id), ["a"]);
  assert.deepEqual(filtrarTorneos(ts, { estado: "draft", hoy }).map((t) => t.id), ["b"]);
});

test("v0.89: buscar por nombre, todas las palabras, sin tildes ni mayúsculas", () => {
  const ts = [
    { id: "1", name: "League Cup Màquina del Temps", date: "2026-11-01", kind: "x", status: "open" },
    { id: "2", name: "Regional de Niza", date: "2026-10-17", kind: "x", status: "closed" },
  ];
  assert.deepEqual(filtrarTorneos(ts, { texto: "maquina cup" }).map((t) => t.id), ["1"]);
  assert.deepEqual(filtrarTorneos(ts, { texto: "NIZA" }).map((t) => t.id), ["2"]);
  assert.equal(filtrarTorneos(ts, { texto: "" }).length, 2);
});
