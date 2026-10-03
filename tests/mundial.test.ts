import { test } from "node:test";
import assert from "node:assert/strict";
import { estadoMundial, porPuestoZona } from "../src/lib/mundial.ts";

test("sin puesto apuntado no se inventa nada", () => {
  assert.deepEqual(estadoMundial(null, 140), { tipo: "sin-dato" });
  assert.deepEqual(estadoMundial(0, 140), { tipo: "sin-dato" });
});

test("la última plaza (140 de 140) está dentro con margen 0", () => {
  assert.deepEqual(estadoMundial(140, 140), { tipo: "dentro", puesto: 140, plazas: 140, margen: 0 });
});

test("el 141 está fuera a un puesto", () => {
  assert.deepEqual(estadoMundial(141, 140), { tipo: "fuera", puesto: 141, plazas: 140, faltan: 1 });
});

test("zona sin plazas conocidas: se enseña el puesto y nada más", () => {
  assert.deepEqual(estadoMundial(12, null), { tipo: "sin-plazas", puesto: 12 });
});

test("orden: con puesto primero, sin puesto al final por nombre", () => {
  const filas = [
    { name: "Cristina", rankEurope: null },
    { name: "Ibai", rankEurope: 410 },
    { name: "Alex", rankEurope: null },
    { name: "Niccolo", rankEurope: 119 },
  ];
  assert.deepEqual([...filas].sort(porPuestoZona).map((f) => f.name), ["Niccolo", "Ibai", "Alex", "Cristina"]);
});
