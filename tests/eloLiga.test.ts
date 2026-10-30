import { test } from "node:test";
import assert from "node:assert/strict";
import { eloLiga, esperado, kDe, rangoElo, RANGOS_ELO } from "../src/lib/eloLiga.ts";

test("ganarle a quien tiene más Elo da más", () => {
  assert.ok(esperado(0, 200) < 0.5);
  const r = eloLiga([
    { a: "fuerte", b: "x", ganador: "a", fecha: "2026-10-01" },
    { a: "fuerte", b: "y", ganador: "a", fecha: "2026-10-02" },
    { a: "novato", b: "fuerte", ganador: "a", fecha: "2026-10-03" },
  ]);
  const novato = r.find((x) => x.id === "novato")!;
  assert.ok(novato.ultimo > 20); // le ganó al que iba arriba: sube más de la mitad de K
});

test("cuantas más partidas, menos se mueve", () => {
  assert.equal(kDe(0), 40);
  assert.equal(kDe(15), 24);
  assert.equal(kDe(40), 16);
});

test("v0.83: se empieza en 0 y no se baja de 0; en colocación hasta la 5.ª", () => {
  const r = eloLiga([{ a: "a", b: "b", ganador: "a", fecha: "2026-10-01" }], ["c"]);
  assert.equal(r.find((x) => x.id === "b")!.elo, 0);   // perdió, pero el suelo es 0
  assert.equal(r.find((x) => x.id === "a")!.elo, 20);  // K 40 × (1 − 0,5)
  assert.ok(r.every((x) => x.provisional));
  const seis = Array.from({ length: 6 }, (_, i) => ({ a: "a", b: "b", ganador: "a" as const, fecha: `2026-10-0${i + 1}` }));
  const r2 = eloLiga(seis, ["c"]);
  assert.equal(r2[0].id, "a");
  assert.equal(r2[0].provisional, false);
  assert.equal(r2[r2.length - 1].id, "c"); // sin partidas: en colocación, al final
});

test("v0.83: los rangos, de Madera a Lapislázuli", () => {
  assert.equal(RANGOS_ELO.length, 10);
  assert.equal(rangoElo(0).rango.nombre, "Madera");
  assert.equal(rangoElo(160).rango.nombre, "Plata");
  assert.equal(rangoElo(160).faltan, 65);
  assert.equal(rangoElo(5000).rango.nombre, "Lapislázuli");
  assert.equal(rangoElo(5000).siguiente, null);
});
