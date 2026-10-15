import { test } from "node:test";
import assert from "node:assert/strict";
import { emparejarSinRepetir, pairRound } from "../src/lib/stats.ts";
import type { MatchFull } from "../src/lib/types.ts";

const ID = ["ibai", "cristina", "alex", "alusat", "delia", "lauty", "niccolo", "rol", "peru", "jeremias", "javi", "victor"];

/** Una partida de la competición; `jugada` decide si tiene resultado. */
const partida = (a: string, b: string, round: number, jugada: boolean): MatchFull => ({
  id: `${a}-${b}-${round}`, playerAId: a, playerBId: b, round, date: "2026-10-01",
  competitionId: "liga", tournamentId: null, status: jugada ? "done" : "pending",
  seriesResult: jugada ? "a" : null, games: [],
} as unknown as MatchFull);

const claves = (pares: Array<[string, string]>) => pares.map(([a, b]) => [a, b].sort().join("|"));

/* ------------------------------------------- EL FALLO DE TU CAPTURA ---- */

test("EL FALLO QUE ESTO CORRIGE: la J3 no puede repetir los cruces PENDIENTES de la J2", () => {
  // La J2 está creada pero sin jugar. Antes el generador solo miraba las
  // jugadas, y la J3 proponía exactamente los mismos cruces.
  const j2 = [
    partida("alex", "cristina", 2, false), partida("delia", "lauty", 2, false),
    partida("niccolo", "rol", 2, false), partida("peru", "jeremias", 2, false),
    partida("javi", "victor", 2, false), partida("ibai", "alusat", 2, false),
  ];
  const { pairs, repetidos } = pairRound("league", ID, j2);
  const j2claves = new Set(claves(j2.map((m) => [m.playerAId, m.playerBId!] as [string, string])));
  for (const c of claves(pairs)) assert.ok(!j2claves.has(c), `repite ${c}`);
  assert.equal(repetidos, 0);
});

/* ---------------------------------------------- LIGA COMPLETA ---------- */

test("12 jugadores: 11 jornadas seguidas sin un solo cruce repetido", () => {
  // Con el algoritmo voraz de antes, esto se atascaba hacia la quinta o
  // sexta jornada aunque existiera combinación, y repetía a propósito.
  const historial: MatchFull[] = [];
  const vistos = new Set<string>();
  for (let r = 1; r <= 11; r++) {
    const { pairs, repetidos } = pairRound("league", ID, historial);
    assert.equal(pairs.length, 6, `jornada ${r}: deberían ser 6 cruces`);
    assert.equal(repetidos, 0, `jornada ${r} repite cruces`);
    for (const [a, b] of pairs) {
      const c = [a, b].sort().join("|");
      assert.ok(!vistos.has(c), `jornada ${r} repite ${c}`);
      vistos.add(c);
      historial.push(partida(a, b, r, false)); // pendientes: también cuentan
    }
  }
  assert.equal(vistos.size, 66, "12 jugadores = 66 cruces, todos distintos");
});

test("con todos los cruces hechos, sigue dando jornada y AVISA de que repite", () => {
  // Segunda vuelta: ya no hay combinación nueva. No se queda en blanco.
  const todos: MatchFull[] = [];
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) todos.push(partida(ID[i], ID[j], 1, true));
  const r = pairRound("league", ID.slice(0, 4), todos);
  assert.equal(r.pairs.length, 2);
  assert.ok(r.repetidos > 0);
});

/* ------------------------------------------------------- impares ------- */

test("número impar: alguien descansa, y nadie repite", () => {
  const cinco = ID.slice(0, 5);
  const r = emparejarSinRepetir(cinco, new Set());
  assert.ok(r);
  assert.equal(r!.pairs.length, 2);
  assert.ok(r!.bye && cinco.includes(r!.bye));
  // Descansa el último del orden, como antes.
  assert.equal(r!.bye, "delia");
});

test("los rivales de fuera no son cruces de la liga", () => {
  const conExterno = [{ ...partida("ibai", "x", 1, true), playerBId: null } as unknown as MatchFull];
  assert.equal(pairRound("league", ID, conExterno).repetidos, 0);
});
