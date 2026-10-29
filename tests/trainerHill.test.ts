import { test } from "node:test";
import assert from "node:assert/strict";
import { liderDeSlug, parseTrainerHill } from "../src/lib/trainerHill.ts";

test("del nombre de Limitless al líder y su variante", () => {
  assert.deepEqual(liderDeSlug("dragapult-dusknoir"), { lider: "dragapult", segundo: "dusknoir" });
  assert.deepEqual(liderDeSlug("dragapult-ex"), { lider: "dragapult", segundo: "" });
  assert.deepEqual(liderDeSlug("mega-excadrill-ex"), { lider: "excadrill-mega", segundo: "" });
  assert.deepEqual(liderDeSlug("n-zoroark"), { lider: "zoroark", segundo: "" });
  assert.deepEqual(liderDeSlug("slowking-scr"), { lider: "slowking", segundo: "" });
  assert.deepEqual(liderDeSlug("raging-bolt-ogerpon"), { lider: "raging-bolt", segundo: "ogerpon" });
  assert.equal(liderDeSlug("basic-box-m").lider, "basic-box");
  assert.equal(liderDeSlug("ogerpon-meganium-hydrapple").lider, "ogerpon");
});

const CSV = `deck1,deck2,wins,losses,ties,total,win_rate
alakazam-dudunsparce,alakazam-dudunsparce,879,879,131,1010,48.8
alakazam-dudunsparce,basic-box-m,647,501,137,1285,53.9
basic-box-m,alakazam-dudunsparce,501,647,137,1285,42.5
dragapult-dusknoir,mega-excadrill-ex,40,30,2,72,55.0`;

test("el CSV real: sin espejos ni duplicados en los dos sentidos", () => {
  const r = parseTrainerHill(CSV);
  assert.equal(r.filas.length, 2);
  assert.deepEqual(r.errores, []);
  assert.equal(r.partidas, 647 + 501 + 137 + 72);
  assert.equal(r.filas[0].lider1, "alakazam");
  assert.equal(r.filas[1].lider2, "excadrill-mega");
});

test("un fichero que no es de Trainer Hill se rechaza con motivo", () => {
  assert.equal(parseTrainerHill("a,b,c\n1,2,3").filas.length, 0);
  assert.ok(parseTrainerHill("a,b,c\n1,2,3").errores.length > 0);
  assert.ok(parseTrainerHill("").errores.length > 0);
});
