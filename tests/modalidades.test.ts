import { test } from "node:test";
import assert from "node:assert/strict";
import { clasificacionEquipos, jornadaEquipos, mazoDePartida, partidasDeDuelo } from "../src/lib/modalidades.ts";

test("mazo fijo: sin elegir, se pone el entregado; otro distinto se rechaza", () => {
  assert.deepEqual(mazoDePartida(["d1"], null), { ok: true, deckId: "d1" });
  assert.equal(mazoDePartida(["d1"], "d2").ok, false);
  assert.deepEqual(mazoDePartida([], "d9"), { ok: true, deckId: "d9" });
});

test("tres mazos: vale cualquiera de los entregados, y hay que elegir", () => {
  assert.deepEqual(mazoDePartida(["d1", "d2", "d3"], "d2"), { ok: true, deckId: "d2" });
  assert.equal(mazoDePartida(["d1", "d2"], null).ok, false);
  assert.equal(mazoDePartida(["d1", "d2"], "d7").ok, false);
});

test("jornadas por equipos: todos contra todos sin repetir", () => {
  const ids = ["A", "B", "C", "D"];
  const vistos = new Set<string>();
  for (let r = 1; r <= 3; r++) {
    for (const [a, b] of jornadaEquipos(ids, r).cruces) vistos.add([a, b].sort().join(""));
  }
  assert.equal(vistos.size, 6);
  assert.equal(jornadaEquipos(["A", "B", "C"], 1).cruces.length, 1);
  assert.ok(jornadaEquipos(["A", "B", "C"], 1).descansa);
});

test("duelo: miembro i contra miembro i", () => {
  assert.deepEqual(partidasDeDuelo({ id: "x", name: "", members: ["a1", "a2", "a3"] }, { id: "y", name: "", members: ["b1", "b2", "b3"] }),
    [["a1", "b1"], ["a2", "b2"], ["a3", "b3"]]);
});

test("gana el duelo quien gana 2 de 3; puntos 3/1/0", () => {
  const eq = [{ id: "X", name: "", members: ["a1", "a2", "a3"] }, { id: "Y", name: "", members: ["b1", "b2", "b3"] }];
  const t = clasificacionEquipos(eq, [
    { round: 1, playerAId: "a1", playerBId: "b1", winner: "a" },
    { round: 1, playerAId: "a2", playerBId: "b2", winner: "b" },
    { round: 1, playerAId: "a3", playerBId: "b3", winner: "a" },
  ]);
  assert.equal(t[0].teamId, "X");
  assert.equal(t[0].puntos, 3);
  assert.equal(t[0].victorias, 2);
  assert.equal(t[1].puntos, 0);
});
