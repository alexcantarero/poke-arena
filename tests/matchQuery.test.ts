import { test } from "node:test";
import assert from "node:assert/strict";
import { filasAPedir, planDeConsulta, TOPE_SIN_PAGINAR, type FiltroConsultable } from "../src/lib/matchQuery.ts";

const vacio: FiltroConsultable = {
  scope: "all", from: "", to: "", tournamentKind: "", competitionKind: "",
  tournamentId: "", competitionId: "", archetypeId: "", playerId: "", format: "", round: null,
};
const con = (over: Partial<FiltroConsultable>): FiltroConsultable => ({ ...vacio, ...over });

/* Lo que de verdad protege este fichero: que el día que alguien añada un
   filtro nuevo a `MatchFilter` y no lo traduzca, no se cuele en silencio
   como «ya lo resuelve SQL» y empiece a devolver filas de más. */

test("sin filtros: nada que unir y se puede paginar en la base", () => {
  const p = planDeConsulta(vacio);
  assert.equal(p.sql.ambito, "");
  assert.equal(p.sql.uneTorneos, false);
  assert.equal(p.sql.uneCompeticiones, false);
  assert.equal(p.paginable, true);
});

test("el arquetipo es el único filtro que impide paginar en la base", () => {
  assert.equal(planDeConsulta(con({ archetypeId: "a-dragapult" })).paginable, false);
  // Y todos los demás, por separado, sí dejan paginar.
  for (const f of [
    { scope: "league" }, { scope: "online" }, { from: "2026-01-01" }, { to: "2026-12-31" },
    { tournamentId: "t1" }, { competitionId: "c1" }, { playerId: "p1" },
    { tournamentKind: "regional" }, { competitionKind: "league" }, { format: "standard" },
    { round: 3 },
  ] as Partial<FiltroConsultable>[]) {
    assert.equal(planDeConsulta(con(f)).paginable, true, JSON.stringify(f));
  }
});

test("el filtro de arquetipo viaja aparte, para aplicarlo con applyMatchFilter", () => {
  const p = planDeConsulta(con({ archetypeId: "a-gardevoir", playerId: "p1" }));
  assert.equal(p.enMemoria.archetypeId, "a-gardevoir");
  // Lo demás sí baja: el conjunto que se trae ya viene recortado por jugador.
  assert.equal(p.sql.jugadorId, "p1");
});

test("se une con torneos solo cuando hace falta una columna suya", () => {
  assert.equal(planDeConsulta(con({ tournamentKind: "regional" })).sql.uneTorneos, true);
  assert.equal(planDeConsulta(con({ format: "standard" })).sql.uneTorneos, true);
  assert.equal(planDeConsulta(con({ scope: "onsite" })).sql.uneTorneos, true);
  assert.equal(planDeConsulta(con({ scope: "online" })).sql.uneTorneos, true);
  // Filtrar por UN torneo concreto es `matches.tournament_id`: no hace falta unir.
  assert.equal(planDeConsulta(con({ tournamentId: "t1" })).sql.uneTorneos, false);
  assert.equal(planDeConsulta(con({ scope: "tournament" })).sql.uneTorneos, false);
});

test("se une con competiciones solo por el tipo", () => {
  assert.equal(planDeConsulta(con({ competitionKind: "league" })).sql.uneCompeticiones, true);
  assert.equal(planDeConsulta(con({ competitionId: "c1" })).sql.uneCompeticiones, false);
  assert.equal(planDeConsulta(con({ scope: "league" })).sql.uneCompeticiones, false);
});

test("un ámbito que no existe se trata como «todo», no revienta", () => {
  assert.equal(planDeConsulta(con({ scope: "inventado" })).sql.ambito, "");
});

test("filasAPedir: paginable pide una fila de más para saber si hay siguiente", () => {
  const p = planDeConsulta(vacio);
  assert.deepEqual(filasAPedir(p, 40, 1), { limit: 41, offset: 0, recortaDespues: false });
  assert.deepEqual(filasAPedir(p, 40, 3), { limit: 41, offset: 80, recortaDespues: false });
  // Página 0 o negativa no puede dar un offset negativo.
  assert.equal(filasAPedir(p, 40, 0).offset, 0);
  assert.equal(filasAPedir(p, 40, -5).offset, 0);
});

test("filasAPedir: sin paginar se trae el conjunto entero hasta el tope", () => {
  const p = planDeConsulta(con({ archetypeId: "a-dragapult" }));
  const r = filasAPedir(p, 40, 2);
  assert.equal(r.limit, TOPE_SIN_PAGINAR);
  // Offset 0 siempre: el recorte de página lo hace quien llama, DESPUÉS de
  // filtrar por arquetipo. Un offset aquí se saltaría filas que sí valían.
  assert.equal(r.offset, 0);
  assert.equal(r.recortaDespues, true);
});
