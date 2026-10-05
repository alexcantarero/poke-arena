import { test } from "node:test";
import assert from "node:assert/strict";
import { ELO_PESOS, eloTable, pesoElo } from "../src/lib/stats.ts";

const base = {
  status: "done", competitionId: null, tournamentId: null, playerBId: null,
  opponentPlayerId: null, opponentName: null, games: [], seriesResult: null, firstTurn: null,
};
// Solo los campos que mira eloTable.
const m = (o: Record<string, unknown>) => ({ ...base, id: String(Math.random()), date: "2026-09-01", ...o }) as never;
const players = [{ id: "a" }, { id: "b" }] as never;
const cfg = { eloStart: 1000, eloK: 24, eloScope: "all", eloSince: null };

test("pesos: regional pesa más que un challenge, y el online menos", () => {
  assert.equal(pesoElo({ competitionId: null, tournamentId: "t" }, { kind: "regional" }), ELO_PESOS.regional);
  assert.ok(ELO_PESOS.regional > ELO_PESOS.league_challenge);
  assert.equal(pesoElo({ competitionId: null, tournamentId: "t" }, { kind: "league_cup", scope: "online" }), ELO_PESOS.online);
  assert.equal(pesoElo({ competitionId: "c", tournamentId: null }), ELO_PESOS.league);
});

test("una ronda ganada contra alguien de fuera sube el Elo, y más en un Regional", () => {
  const ronda = (t: string) => m({ playerAId: "a", tournamentId: t, opponentName: "Fulano", seriesResult: "a" });
  const torneos = new Map([["chal", { kind: "league_challenge" }], ["reg", { kind: "regional" }]]);
  const enChal = eloTable([ronda("chal")], players, cfg, torneos).rating.a;
  const enReg = eloTable([ronda("reg")], players, cfg, torneos).rating.a;
  assert.equal(enChal, 1012);   // 24 × (1 − 0,5)
  assert.equal(enReg, 1018);    // 24 × 1,5 × (1 − 0,5)
});

test("la ronda solo mueve a quien la apuntó, aunque el rival sea del grupo", () => {
  const r = eloTable([m({ playerAId: "a", tournamentId: "t", opponentPlayerId: "b", seriesResult: "a" })],
    players, cfg, new Map([["t", { kind: "league_challenge" }]]));
  assert.equal(r.rating.a, 1012);
  assert.equal(r.rating.b, 1000);
});

test("byes y rondas sin resultado no cuentan", () => {
  const r = eloTable([
    m({ playerAId: "a", tournamentId: "t", opponentName: "BYE", seriesResult: "a" }),
    m({ playerAId: "a", tournamentId: "t", opponentName: "Mengano" }),
  ], players, cfg, new Map([["t", { kind: "league_challenge" }]]));
  assert.equal(r.rating.a, 1000);
});

test("la liga interna sigue siendo suma cero", () => {
  const r = eloTable([m({ playerAId: "a", playerBId: "b", competitionId: "c", seriesResult: "a" })], players, cfg);
  assert.equal(r.rating.a + r.rating.b, 2000);
});
