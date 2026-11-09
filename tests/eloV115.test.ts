import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BONUS_RESULTADO, ELO_PESOS, ELO_PROVISIONAL, bonoResultado, claveEvento, eloTable, rivalReferencia,
} from "../src/lib/stats.ts";
import { formaDe } from "../src/lib/forma.ts";
import { divisionDeElo } from "../src/lib/divisionElo.ts";

const base = {
  status: "done", competitionId: null, tournamentId: null, playerBId: null, round: 1,
  opponentPlayerId: null, opponentName: "Fulano", games: [], seriesResult: null, firstTurn: null,
};
let n = 0;
const m = (o: Record<string, unknown>) => ({ ...base, id: `m${String(++n).padStart(4, "0")}`, date: "2026-09-01", ...o }) as never;
const players = [{ id: "a" }, { id: "b" }] as never;
const cfg = { eloStart: 1000, eloK: 24, eloScope: "all", eloSince: null };

test("pesos: cuanto mayor el evento, más pesa; online lo que menos", () => {
  assert.ok(ELO_PESOS.online < ELO_PESOS.league_challenge);
  assert.ok(ELO_PESOS.league_challenge < ELO_PESOS.league_cup);
  assert.ok(ELO_PESOS.league_cup < ELO_PESOS.regional);
  assert.ok(ELO_PESOS.regional < ELO_PESOS.international);
  assert.ok(ELO_PESOS.international < ELO_PESOS.worlds);
});

test("clave del evento: online manda sobre el tipo y los alias de Pokémon Cup/Challenge", () => {
  assert.equal(claveEvento({ kind: "league_cup", scope: "online" }), "online");
  assert.equal(claveEvento({ kind: "pokemon_cup" }), "league_cup");
  assert.equal(claveEvento({ kind: "pokemon_challenge" }), "league_challenge");
  assert.equal(claveEvento({ kind: "inventado" }), "other");
  assert.equal(claveEvento(undefined), "other");
});

test("rival de referencia: más fuerte en eventos grandes y en el top cut", () => {
  assert.equal(rivalReferencia({ kind: "league_challenge" }, false), 1000);
  assert.equal(rivalReferencia({ kind: "league_cup" }, false), 1100);
  assert.equal(rivalReferencia({ kind: "league_cup" }, true), 1200);
  assert.equal(rivalReferencia({ kind: "regional" }, true), 1400);
  assert.equal(rivalReferencia({ kind: "worlds" }, false), 1450);
  assert.equal(rivalReferencia({ kind: "regional", scope: "online" }, true), 1000);
});

test("bonus por puesto, y lo online solo con 16 o más", () => {
  assert.equal(bonoResultado({ kind: "regional" }, 1), 150);
  assert.equal(bonoResultado({ kind: "regional" }, 20), 60);
  assert.equal(bonoResultado({ kind: "regional" }, 300), 0);
  assert.equal(bonoResultado({ kind: "league_cup" }, 5), 15);
  assert.equal(bonoResultado({ kind: "league_challenge" }, 5), 0);
  assert.equal(bonoResultado({ kind: "online", playerCount: 40 }, 1), 15);
  assert.equal(bonoResultado({ kind: "online", playerCount: 12 }, 1), 0);
  assert.equal(bonoResultado({ kind: "regional" }, null), 0);
  // Las tablas van de mejor a peor puesto y de más a menos puntos.
  for (const t of Object.values(BONUS_RESULTADO)) {
    for (let i = 1; i < t.length; i++) assert.ok(t[i][0] > t[i - 1][0] && t[i][1] < t[i - 1][1]);
  }
});

test("el bonus entra en la fecha del torneo, después de sus rondas, y sale en el historial", () => {
  const torneos = new Map([["cup", {
    kind: "league_cup", suizo: 5, playerCount: 20, fecha: "2026-09-01",
    puestos: [{ playerId: "a", placement: 1 }, { playerId: "b", placement: 9 }],
  }]]);
  const r = eloTable([m({ playerAId: "a", tournamentId: "cup", seriesResult: "a" })], players, cfg, torneos);
  const h = r.history.a;
  assert.equal(h[h.length - 1].bonus, true);
  assert.equal(h[h.length - 1].delta, 40);
  assert.equal(r.rating.b, 1000); // 9.º en una Cup: sin bonus
  assert.ok(r.rating.a > 1040);
});

test("una ronda de top cut se juega contra un rival más fuerte: gana más", () => {
  const torneos = new Map([["reg", { kind: "regional", suizo: 9 }]]);
  const suizo = eloTable([m({ playerAId: "a", tournamentId: "reg", round: 3, seriesResult: "a" })], players, cfg, torneos).rating.a;
  const corte = eloTable([m({ playerAId: "a", tournamentId: "reg", round: 10, seriesResult: "a" })], players, cfg, torneos).rating.a;
  assert.ok(corte > suizo);
});

test("K provisional: las 20 primeras partidas mueven el doble", () => {
  const ronda = (d: string) => m({ playerAId: "a", tournamentId: "c", seriesResult: "a", date: d });
  const torneos = new Map([["c", { kind: "league_challenge" }]]);
  const lista = Array.from({ length: ELO_PROVISIONAL + 1 }, (_, i) => ronda(`2026-09-${String(i + 1).padStart(2, "0")}`));
  const h = eloTable(lista, players, cfg, torneos).history.a;
  const d20 = h[ELO_PROVISIONAL].delta!, d21 = h[ELO_PROVISIONAL + 1].delta!;
  // La 21.ª ya no lleva el ×2 (gana menos también porque el Elo ya es mayor).
  assert.ok(d21 < d20 / 1.5);
});

test("online: un top 4 en un torneo de 64 suma su bonus encima de las rondas", () => {
  const torneos = new Map([["on", { kind: "online", scope: "online" }]]);
  let semilla = 7;
  const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
  const lista = Array.from({ length: 80 }, (_, i) => m({
    playerAId: "a", tournamentId: "on", seriesResult: azar() < 0.6 ? "a" : "b",
    date: `2026-${String(7 + Math.floor(i / 28)).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
  }));
  // Con los torneos online de 16+ y algún top 8, el bonus suma encima.
  const conBonus = new Map([["on", { kind: "online", scope: "online", playerCount: 64, fecha: "2026-09-28",
    puestos: [{ playerId: "a", placement: 4 }] }]]);
  const sin = eloTable(lista, players, cfg, torneos).rating.a;
  const con = eloTable(lista, players, cfg, conBonus).rating.a;
  assert.ok(con === sin + 8);
});

test("la liga interna sigue siendo suma cero entre dos jugadores en la misma fase", () => {
  const r = eloTable([m({ playerAId: "a", playerBId: "b", competitionId: "c", seriesResult: "a" })], players, cfg);
  assert.equal(r.rating.a + r.rating.b, 2000);
  assert.deepEqual(r.actividad.a, ["2026-09-01"]);
});

/* ------------------------------------------------------------------ forma */

test("forma: 30 partidas recientes y jugando ayer = el Elo tal cual", () => {
  const fechas = Array.from({ length: 30 }, () => "2026-11-08");
  const f = formaDe(1200, fechas, "2026-11-09");
  assert.equal(f.forma, 1200);
  assert.equal(f.penPocas, 0);
  assert.equal(f.penInactividad, 0);
});

test("forma: pocas partidas restan en proporción", () => {
  const f = formaDe(1100, Array.from({ length: 15 }, () => "2026-11-01"), "2026-11-09");
  assert.equal(f.penPocas, 50);
  assert.equal(f.forma, 1050);
});

test("forma: tras 21 días sin jugar, 5 por día hasta 150", () => {
  const a = formaDe(1200, Array.from({ length: 40 }, () => "2026-10-09"), "2026-11-09"); // 31 días
  assert.equal(a.diasSinJugar, 31);
  assert.equal(a.penInactividad, 50);
  const b = formaDe(1200, ["2026-01-01"], "2026-11-09");
  assert.equal(b.penInactividad, 150);
  assert.equal(b.penPocas, 100);
  const nunca = formaDe(1000, [], "2026-11-09");
  assert.equal(nunca.forma, 750);
  assert.equal(nunca.diasSinJugar, null);
});

/* -------------------------------------------------------------- divisiones */

test("divisiones con los nombres de la web", () => {
  assert.equal(divisionDeElo(950, { partidas: 30 }).id, "hierro");
  assert.deepEqual(divisionDeElo(1000, { partidas: 30 }), { id: "bronce", sub: "IV", faltan: 100, siguiente: "plata" });
  assert.equal(divisionDeElo(1099, { partidas: 30 }).sub, "I");
  assert.equal(divisionDeElo(1250, { partidas: 30 }).id, "oro");
  assert.equal(divisionDeElo(1450, { partidas: 30 }).id, "diamante");
  assert.equal(divisionDeElo(1550, { partidas: 30 }).id, "maestro");
  assert.equal(divisionDeElo(1800, { partidas: 30 }).id, "granmaestro");
  assert.equal(divisionDeElo(1800, { partidas: 30 }).faltan, null);
  assert.equal(divisionDeElo(900, { challenger: true }).id, "challenger");
  assert.equal(divisionDeElo(1300, { partidas: 3 }).id, "novato");
});
