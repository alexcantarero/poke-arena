import { test } from "node:test";
import assert from "node:assert/strict";
import { agruparTorneos, filtrarTorneos } from "../src/lib/torneosLista.ts";

const t = (id: string, date: string, extra: Partial<{ endDate: string; kind: string; status: string }> = {}) =>
  ({ id, date, kind: "league_challenge", status: "draft", ...extra });

test("hoy, próximos (del más cercano) y pasados (del más reciente), en ese orden", () => {
  const g = agruparTorneos([
    t("ayer", "2026-09-30", { status: "open" }),
    t("lejos", "2026-11-21"),
    t("hoy", "2026-10-01"),
    t("pronto", "2026-10-03"),
    t("viejo", "2026-09-12", { status: "closed" }),
  ], "2026-10-01");
  assert.deepEqual(g.hoy.map((x) => x.id), ["hoy"]);
  assert.deepEqual(g.proximos.map((x) => x.id), ["pronto", "lejos"]);
  assert.deepEqual(g.pasados.map((x) => x.id), ["ayer", "viejo"]);
});

test("un Regional de dos días está «hoy» también el segundo día", () => {
  const g = agruparTorneos([t("niza", "2026-10-17", { endDate: "2026-10-18", kind: "regional" })], "2026-10-18");
  assert.equal(g.hoy.length, 1);
});

test("filtros combinados: tipo, estado y rango de fechas", () => {
  const ts = [
    t("a", "2026-10-04", { kind: "league_cup" }),
    t("b", "2026-10-04"),
    t("c", "2026-09-19", { status: "closed" }),
    t("niza", "2026-10-17", { endDate: "2026-10-18", kind: "regional" }),
  ];
  assert.deepEqual(filtrarTorneos(ts, { tipo: "league_cup" }).map((x) => x.id), ["a"]);
  assert.deepEqual(filtrarTorneos(ts, { estado: "closed" }).map((x) => x.id), ["c"]);
  assert.deepEqual(filtrarTorneos(ts, { desde: "2026-10-18", hasta: "2026-10-31" }).map((x) => x.id), ["niza"]);
  assert.deepEqual(filtrarTorneos(ts, { dePersona: new Set(["b", "c"]) }).map((x) => x.id), ["b", "c"]);
});

