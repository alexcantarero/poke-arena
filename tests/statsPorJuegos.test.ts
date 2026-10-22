import { test } from "node:test";
import assert from "node:assert/strict";
import { archetypeStats } from "../src/lib/stats.ts";
import type { Archetype, MatchFull } from "../src/lib/types.ts";

/* v0.60 — Decisión de Ibai: las estadísticas por mazo cuentan POR JUEGOS. Cada
   juego suma al mazo con el que se jugó (el suyo si lo tiene, el de la serie
   si no). Este es el caso real que lo destapó: Javi contra Jeremías, 1-2, liga
   con «mazo distinto en cada juego». */

const arch = (id: string): Archetype => ({ id, name: id, main: id, secondary: "", type: "colorless", limitlessId: null, parentId: null });
const EXC = arch("excadrill"), DHEL = arch("dhelmise"), DRAGA = arch("dragapult");
const archById = new Map([EXC, DHEL, DRAGA].map((a) => [a.id, a]));
const index = new Map<string, Archetype | undefined>();

const juego = (n: number, winner: string, archA: string | null, archB: string | null) => ({
  id: n, matchId: "m", number: n, winner, first: "", prizesA: null, prizesB: null, penaltyA: false, penaltyB: false,
  turns: null, note: "", mulligansA: 0, mulligansB: 0, archetypeAId: archA, archetypeBId: archB,
});
const partida = (over: Partial<MatchFull>): MatchFull => ({
  id: "m", competitionId: "liga", tournamentId: null, round: 3, date: "2026-10-15",
  playerAId: "javi", playerBId: "jeremias", opponentPlayerId: null, opponentName: "",
  deckAId: null, archetypeAId: EXC.id, deckBId: null, opponentArchetypeId: DHEL.id,
  bestOf: 3, status: "done", seriesResult: null, firstTurn: "", note: "",
  createdBy: null, updatedBy: null, updatedAt: null, createdAt: new Date(), games: [], ...over,
} as MatchFull);

test("EL CASO REAL: 1-2 con Dragapult en el juego 1 y Dhelmise en el 3", () => {
  const m = partida({ games: [juego(1, "b", null, DRAGA.id), juego(2, "a", null, DHEL.id), juego(3, "b", null, DHEL.id)] });
  const r = new Map(archetypeStats([m], index, undefined, archById).map((x) => [x.archetypeId, x]));
  // Antes: la serie entera a Dhelmise (1 victoria) y Dragapult no aparecía.
  assert.deepEqual([r.get("dragapult")!.played, r.get("dragapult")!.wins], [1, 1]);
  assert.deepEqual([r.get("dhelmise")!.played, r.get("dhelmise")!.wins, r.get("dhelmise")!.losses], [2, 1, 1]);
  // Javi jugó los tres juegos con su mazo de la serie: 3 juegos, 1 victoria.
  assert.deepEqual([r.get("excadrill")!.played, r.get("excadrill")!.wins], [3, 1]);
  assert.equal(r.get("excadrill")!.winRate, 1 / 3);
});

test("mismo mazo toda la serie: cuenta los juegos, no la serie (2-1 = 2 de 3)", () => {
  const m = partida({ games: [juego(1, "a", null, null), juego(2, "b", null, null), juego(3, "a", null, null)] });
  const r = new Map(archetypeStats([m], index, undefined, archById).map((x) => [x.archetypeId, x]));
  assert.deepEqual([r.get("excadrill")!.played, r.get("excadrill")!.wins], [3, 2]);
});

test("sin juegos (empate por tiempo en modo rápido): una unidad, empatada", () => {
  const m = partida({ games: [], seriesResult: "tie" });
  const r = new Map(archetypeStats([m], index, undefined, archById).map((x) => [x.archetypeId, x]));
  assert.deepEqual([r.get("excadrill")!.played, r.get("excadrill")!.ties], [1, 1]);
  assert.equal(r.get("excadrill")!.winRate, 0.5);
});

test("al filtrar por jugador, solo cuentan sus juegos", () => {
  const m = partida({ games: [juego(1, "b", null, DRAGA.id), juego(2, "a", null, DHEL.id)] });
  const ids = archetypeStats([m], index, "javi", archById).map((x) => x.archetypeId);
  assert.deepEqual(ids, ["excadrill"]);
});

import { formaReciente } from "../src/lib/stats.ts";

test("forma: los últimos 5, del más antiguo al más reciente, desde cada lado", () => {
  const ms = [
    partida({ id: "1", date: "2026-10-01", seriesResult: "a" }),
    partida({ id: "2", date: "2026-10-02", seriesResult: "b" }),
    partida({ id: "3", date: "2026-10-03", seriesResult: "tie" }),
    partida({ id: "4", date: "2026-10-04", seriesResult: "a" }),
    partida({ id: "5", date: "2026-10-05", seriesResult: "a" }),
    partida({ id: "6", date: "2026-10-06", seriesResult: "b" }),
  ];
  assert.deepEqual(formaReciente(ms, "javi"), ["l", "t", "w", "w", "l"]);     // la del día 1 ya no entra
  assert.deepEqual(formaReciente(ms, "jeremias"), ["w", "t", "l", "l", "w"]);
  assert.deepEqual(formaReciente(ms, "nadie"), []);
});
