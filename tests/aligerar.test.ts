import { test } from "node:test";
import assert from "node:assert/strict";
import { mazosLigeros, torneosLigeros } from "../src/lib/aligerar.ts";

test("los mazos viajan sin su lista, pero se sabe si la tienen", () => {
  const [a, b] = mazosLigeros([
    { id: "a", list: "4 Dreepy\n...", listJson: { x: 1 }, notes: "larga" },
    { id: "b", list: "   ", listJson: null, notes: "" },
  ]);
  assert.equal(a.list, "1"); assert.equal(a.listJson, null); assert.equal(a.notes, "");
  assert.equal(b.list, "");
  assert.equal(a.id, "a");
});

test("los torneos: los más recientes, sin resultados", () => {
  const ts = torneosLigeros([
    { id: "v", date: "2026-01-01", results: [1, 2] },
    { id: "n", date: "2026-11-01", results: [3] },
    { id: "m", date: "2026-06-01" },
  ], 2);
  assert.deepEqual(ts.map((t) => t.id), ["n", "m"]);
  assert.equal("results" in ts[0], false);
});
