import { test } from "node:test";
import assert from "node:assert/strict";
import { tocaPedirNick, tocaRecordarLadder } from "../src/lib/recordatorios.ts";

const ahora = Date.parse("2026-11-09T12:00:00Z");

test("ladder: nunca puesto o de hace 7 días → recordar; pospuesto → 7 días de silencio", () => {
  assert.equal(tocaRecordarLadder(null, null, ahora), true);
  assert.equal(tocaRecordarLadder("2026-11-05T10:00:00Z", null, ahora), false);
  assert.equal(tocaRecordarLadder("2026-11-02T11:00:00Z", null, ahora), true);
  assert.equal(tocaRecordarLadder(null, "2026-11-08T10:00:00Z", ahora), false);
  assert.equal(tocaRecordarLadder(null, "2026-11-01T10:00:00Z", ahora), true);
  assert.equal(tocaRecordarLadder(new Date("2026-11-08T10:00:00Z"), null, ahora), false);
});

test("nick de Limitless: se pide hasta que lo pone; «más tarde» lo calla un día", () => {
  assert.equal(tocaPedirNick(null, null, ahora), true);
  assert.equal(tocaPedirNick("  ", null, ahora), true);
  assert.equal(tocaPedirNick("elzorro1", null, ahora), false);
  assert.equal(tocaPedirNick("", "2026-11-09T08:00:00Z", ahora), false);
  assert.equal(tocaPedirNick("", "2026-11-07T08:00:00Z", ahora), true);
});
