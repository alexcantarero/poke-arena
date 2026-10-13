import { test } from "node:test";
import assert from "node:assert/strict";
import { agruparTorneos, filtrarTorneos, mejoresPuestosDeTorneos } from "../src/lib/torneosLista.ts";

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

test("elige los cinco mejores puestos de torneos disputados y desempata por fecha reciente", () => {
  const results = [
    { tournamentId: "reciente", playerId: "a", date: "2026-10-12", placement: 2 },
    { tournamentId: "antiguo", playerId: "b", date: "2026-08-10", placement: 2 },
    { tournamentId: "primero", playerId: "c", date: "2026-09-20", placement: 1 },
    { tournamentId: "tercero", playerId: "d", date: "2026-10-01", placement: 3 },
    { tournamentId: "cuarto", playerId: "e", date: "2026-09-01", placement: 4 },
    { tournamentId: "quinto", playerId: "f", date: "2026-08-01", placement: 5 },
    { tournamentId: "sexto", playerId: "g", date: "2026-10-11", placement: 6 },
    { tournamentId: "futuro", playerId: "h", date: "2026-10-20", placement: 1 },
    { tournamentId: "sin-puesto", playerId: "i", date: "2026-10-10", placement: null },
    { tournamentId: "puesto-invalido", playerId: "j", date: "2026-10-10", placement: 0 },
  ];

  assert.deepEqual(
    mejoresPuestosDeTorneos(results, "2026-10-14").map((r) => r.tournamentId),
    ["primero", "reciente", "antiguo", "tercero", "cuarto"],
  );
});
