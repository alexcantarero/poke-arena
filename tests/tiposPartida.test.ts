import { test } from "node:test";
import assert from "node:assert/strict";
import { tipoDePartida } from "../src/lib/tiposPartida.ts";

const online = new Set(["t-online"]);

test("liga, presencial, online y amistoso", () => {
  assert.equal(tipoDePartida({ competitionId: "c1" }, online), "liga");
  assert.equal(tipoDePartida({ tournamentId: "t-online" }, online), "online");
  assert.equal(tipoDePartida({ tournamentId: "t-tienda" }, online), "presencial");
  assert.equal(tipoDePartida({}, online), "amistoso");
});

test("EL FALLO QUE ESTO CORRIGE: un amistoso ya no cuenta como torneo", () => {
  // Antes todo lo que no era de liga caía en «Torneos».
  assert.notEqual(tipoDePartida({ competitionId: null, tournamentId: null }, online), "presencial");
});

test("la liga manda aunque la partida tenga torneo", () => {
  assert.equal(tipoDePartida({ competitionId: "c1", tournamentId: "t-online" }, online), "liga");
});
