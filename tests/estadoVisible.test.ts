import { test } from "node:test";
import assert from "node:assert/strict";
import { estadoVisible, filtrarTorneos } from "../src/lib/torneosLista.ts";

test("v0.88: «En curso» solo si ya ha llegado su fecha y no está cerrado", () => {
  const hoy = "2026-11-03";
  assert.equal(estadoVisible({ status: "open", date: "2026-11-03" }, hoy), "open");
  assert.equal(estadoVisible({ status: "open", date: "2026-11-10" }, hoy), "proximo");
  assert.equal(estadoVisible({ status: "closed", date: "2026-11-10" }, hoy), "closed");
  assert.equal(estadoVisible({ status: "draft", date: "2026-10-01" }, hoy), "draft");
  const ts = [{ id: "a", date: "2026-11-01", kind: "x", status: "open" }, { id: "b", date: "2026-11-20", kind: "x", status: "open" }];
  assert.deepEqual(filtrarTorneos(ts, { estado: "open", hoy }).map((t) => t.id), ["a"]);
  assert.deepEqual(filtrarTorneos(ts, { estado: "proximo", hoy }).map((t) => t.id), ["b"]);
});
