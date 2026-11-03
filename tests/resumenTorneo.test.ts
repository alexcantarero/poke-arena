import { test } from "node:test";
import assert from "node:assert/strict";
import { resumenTorneo } from "../src/lib/resumenTorneo.ts";

test("v0.90: récord, mejor y peor emparejamiento", () => {
  const r = resumenTorneo([
    { rival: "dragapult", nombre: "Dragapult", r: "w" },
    { rival: "dragapult", nombre: "Dragapult", r: "w" },
    { rival: "gardevoir", nombre: "Gardevoir", r: "l" },
    { rival: "zoroark", nombre: "Zoroark", r: "t" },
  ]);
  assert.deepEqual([r.w, r.l, r.t], [2, 1, 1]);
  assert.equal(r.mejor!.rival, "dragapult");
  assert.equal(r.peor!.rival, "gardevoir");
  assert.equal(resumenTorneo([]).mejor, null);
});
