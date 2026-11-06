import { test } from "node:test";
import assert from "node:assert/strict";
import { diasEntre, pesoRecencia, pesosNormalizados, ventajaReciente, VIDA_MEDIA_DIAS } from "../src/lib/recencia.ts";

const cerca = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test("días entre fechas, sin líos de hora", () => {
  assert.equal(diasEntre("2026-11-01", "2026-11-06"), 5);
  assert.equal(diasEntre("2026-11-06", "2026-11-06"), 0);
  assert.equal(diasEntre("2026-11-10", "2026-11-06"), -4);
  assert.equal(diasEntre("no es fecha", "2026-11-06"), 0);
});

test("la vida media: a los 30 días la mitad, a los 60 un cuarto", () => {
  assert.equal(VIDA_MEDIA_DIAS, 30);
  cerca(pesoRecencia("2026-11-06", "2026-11-06"), 1);
  cerca(pesoRecencia("2026-10-07", "2026-11-06"), 0.5);
  cerca(pesoRecencia("2026-09-07", "2026-11-06"), 0.25);
  // Un evento con fecha futura no pesa más que uno de hoy.
  cerca(pesoRecencia("2026-12-01", "2026-11-06"), 1);
});

test("los pesos se normalizan: el total de listas no cambia, cambia el reparto", () => {
  const ev = [
    { id: "reciente", fecha: "2026-11-01", tam: 300 },
    { id: "viejo", fecha: "2026-08-03", tam: 300 },
  ];
  const p = pesosNormalizados(ev, "2026-11-06");
  const total = ev.reduce((s, e) => s + e.tam * p.get(e.id)!, 0);
  cerca(total, 600, 1e-6);
  assert.ok(p.get("reciente")! > 1 && p.get("viejo")! < 1);
  // 90 días de diferencia = tres vidas medias: el reciente pesa 8 veces más.
  cerca(p.get("reciente")! / p.get("viejo")!, 8, 1e-9);
});

test("un solo evento, o varios del mismo día, quedan igual que sin ponderar", () => {
  const uno = pesosNormalizados([{ id: "a", fecha: "2026-07-01", tam: 120 }], "2026-11-06");
  cerca(uno.get("a")!, 1);
  const mismoDia = pesosNormalizados([
    { id: "a", fecha: "2026-09-20", tam: 50 }, { id: "b", fecha: "2026-09-20", tam: 500 },
  ], "2026-11-06");
  cerca(mismoDia.get("a")!, 1);
  cerca(mismoDia.get("b")!, 1);
});

test("sin tamaños, la media de los pesos es 1", () => {
  const p = pesosNormalizados([
    { id: "a", fecha: "2026-11-01", tam: 0 }, { id: "b", fecha: "2026-10-01", tam: 0 },
  ], "2026-11-06");
  cerca((p.get("a")! + p.get("b")!) / 2, 1);
  assert.ok(p.get("a")! > p.get("b")!);
  assert.equal(pesosNormalizados([], "2026-11-06").size, 0);
});

test("ventaja del más reciente sobre el más antiguo, para explicarlo", () => {
  assert.equal(ventajaReciente(["2026-11-01"], "2026-11-06"), null);
  cerca(ventajaReciente(["2026-11-06", "2026-10-07"], "2026-11-06")!, 2);
});
