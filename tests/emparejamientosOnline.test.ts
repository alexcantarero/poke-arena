import { test } from "node:test";
import assert from "node:assert/strict";
import { acumular, celdaDe, nuevoAcumulado, pctDe, resumen } from "../src/lib/emparejamientosOnline.ts";

const D = (id: string) => ({ id, name: id });
const CLASIF = [
  { player: "ana", deck: D("dragapult") }, { player: "bea", deck: D("gardevoir") },
  { player: "cris", deck: D("dragapult") }, { player: "dani", deck: null },
];

test("una partida suma a los dos lados, al revés", () => {
  const acc = acumular(nuevoAcumulado(), CLASIF, [{ player1: "ana", player2: "bea", winner: "ana" }]);
  assert.deepEqual(celdaDe(acc, "dragapult", "gardevoir"), { w: 1, l: 0, t: 0 });
  assert.deepEqual(celdaDe(acc, "gardevoir", "dragapult"), { w: 0, l: 1, t: 0 });
  assert.equal(acc.partidas, 1);
});

test("empate (winner = 0) para los dos", () => {
  const acc = acumular(nuevoAcumulado(), CLASIF, [{ player1: "ana", player2: "bea", winner: 0 }]);
  assert.equal(celdaDe(acc, "dragapult", "gardevoir")!.t, 1);
  assert.equal(pctDe(celdaDe(acc, "dragapult", "gardevoir")!), 0.5);
});

test("LAS REGLAS: bye, doble derrota y mazo desconocido no cuentan", () => {
  const acc = acumular(nuevoAcumulado(), CLASIF, [
    { player1: "ana", player2: null, winner: "ana" },     // bye
    { player1: "ana", player2: "bea", winner: -1 },       // doble derrota
    { player1: "ana", player2: "dani", winner: "ana" },   // a dani le falta el mazo
  ]);
  assert.equal(acc.partidas, 0);
  assert.equal(acc.descartadas, 3);
});

test("un espejo se cuenta aparte y no entra en el % de nadie", () => {
  const acc = acumular(nuevoAcumulado(), CLASIF, [{ player1: "ana", player2: "cris", winner: "ana" }]);
  assert.equal(acc.espejos, 1);
  assert.equal(acc.partidas, 0);
  assert.equal(celdaDe(acc, "dragapult", "dragapult"), null);
});

test("resumen: por partidas, y con el mínimo para que el % no sea ruido", () => {
  const acc = nuevoAcumulado();
  for (let i = 0; i < 40; i++) acumular(acc, CLASIF, [{ player1: "ana", player2: "bea", winner: i % 4 ? "ana" : "bea" }]);
  const r = resumen(acc, { minPartidas: 30 });
  assert.equal(r.length, 2);
  assert.equal(r[0].n, 40);
  assert.equal(r.find((x) => x.id === "dragapult")!.pct, 0.75);
  assert.equal(resumen(acc, { minPartidas: 50 }).length, 0);
});

test("varios torneos se suman", () => {
  const acc = nuevoAcumulado();
  acumular(acc, CLASIF, [{ player1: "ana", player2: "bea", winner: "ana" }]);
  acumular(acc, CLASIF, [{ player1: "ana", player2: "bea", winner: "bea" }]);
  assert.deepEqual(celdaDe(acc, "dragapult", "gardevoir"), { w: 1, l: 1, t: 0 });
});

test("PRIVACIDAD: el resumen no lleva ningún id de jugador", () => {
  const acc = nuevoAcumulado();
  for (let i = 0; i < 40; i++) acumular(acc, CLASIF, [{ player1: "ana", player2: "bea", winner: "ana" }]);
  const json = JSON.stringify(resumen(acc));
  assert.ok(!json.includes("ana") && !json.includes("bea"));
});
