import { test } from "node:test";
import assert from "node:assert/strict";
import {
  idDeTorneo, importarTorneos, nickNormal, vuestrosEnElTorneo,
  type FilaClasificacion, type JugadorConNick, type TorneoRemoto,
} from "../src/lib/limitlessImport.ts";

const torneo: TorneoRemoto = {
  id: "abc123", name: "Pudding Weekly #14", date: "2026-10-11T18:00:00Z",
  format: "STANDARD", players: 128,
};

const jugadores: JugadorConNick[] = [
  { id: "p1", name: "Ibai", limitlessHandle: "IbaiM" },
  { id: "p2", name: "Alex", limitlessHandle: "alexpkmn" },
  { id: "p3", name: "Cristina", limitlessHandle: null },
];

const clasificacion: FilaClasificacion[] = [
  { player: "someguy", name: "Some Guy", placing: 1, record: { wins: 7, losses: 0, ties: 0 } },
  { player: "ibaim", name: "Ibai M", placing: 9, deck: { id: "dragapult", name: "Dragapult ex" },
    record: { wins: 5, losses: 2, ties: 0 } },
  { player: "otra", name: "Otra Persona", placing: 12 },
  { player: "ALEXPKMN", name: "Alex", placing: 40, record: { wins: 3, losses: 4, ties: 0 } },
];

/* ------------------------------------------------- LA REGLA DE PRIVACIDAD */

test("de una clasificación de 128 personas solo salen las del grupo", () => {
  const r = vuestrosEnElTorneo(torneo, clasificacion, jugadores)!;
  assert.equal(r.resultados.length, 2);
  assert.deepEqual(r.resultados.map((x) => x.playerId).sort(), ["p1", "p2"]);

  // Y que no se cuele un nombre ajeno por ninguna rendija: ni «Some Guy» ni
  // «Otra Persona» pueden aparecer en NADA de lo que devuelve la función.
  const serializado = JSON.stringify(r);
  for (const ajeno of ["someguy", "Some Guy", "otra", "Otra Persona"]) {
    assert.ok(!serializado.includes(ajeno), `se ha colado «${ajeno}»`);
  }
});

test("el número de participantes sí cruza: es un recuento, no identifica a nadie", () => {
  assert.equal(vuestrosEnElTorneo(torneo, clasificacion, jugadores)!.playerCount, 128);
});

/* ---------------------------------------------------------- emparejamiento */

test("los nicks se comparan sin mayúsculas: «IbaiM» encuentra «ibaim»", () => {
  // El fallo que esto evita es silencioso: el torneo se importaría con el
  // resultado de nadie y sin un solo error por ninguna parte.
  const r = vuestrosEnElTorneo(torneo, clasificacion, jugadores)!;
  const ibai = r.resultados.find((x) => x.playerId === "p1")!;
  assert.equal(ibai.placement, 9);
  assert.equal(ibai.wins, 5);
  assert.equal(ibai.deckSlug, "dragapult");
});

test("también se mira el nombre visible, no solo el nick", () => {
  const soloNombre: FilaClasificacion[] = [{ name: "alexpkmn", placing: 3 }];
  const r = vuestrosEnElTorneo(torneo, soloNombre, jugadores)!;
  assert.equal(r.resultados[0].playerId, "p2");
});

test("quien no tiene nick no se busca, y no por eso aparece", () => {
  const r = vuestrosEnElTorneo(torneo, clasificacion, jugadores)!;
  assert.ok(!r.resultados.some((x) => x.playerId === "p3"));
});

test("una persona no sale dos veces aunque figure repetida", () => {
  const repe = [...clasificacion, { player: "ibaim", placing: 99 }];
  const r = vuestrosEnElTorneo(torneo, repe, jugadores)!;
  assert.equal(r.resultados.filter((x) => x.playerId === "p1").length, 1);
  // Manda la primera, que es la de mejor puesto porque vienen ordenadas.
  assert.equal(r.resultados.find((x) => x.playerId === "p1")!.placement, 9);
});

test("sin nadie del grupo no se importa: un torneo vacío no sirve de nada", () => {
  assert.equal(vuestrosEnElTorneo(torneo, [{ player: "nadie", placing: 1 }], jugadores), null);
  // Y lo borraría el cron de limpieza a los tres días, así que peor aún.
  assert.equal(vuestrosEnElTorneo(torneo, clasificacion, []), null);
});

test("un puesto ausente o absurdo queda a nulo, no a cero", () => {
  const raras: FilaClasificacion[] = [
    { player: "ibaim" },
    { player: "alexpkmn", placing: 0 },
  ];
  const r = vuestrosEnElTorneo(torneo, raras, jugadores)!;
  assert.equal(r.resultados[0].placement, null);
  assert.equal(r.resultados[1].placement, null);
});

/* ------------------------------------------------------------- identidad */

test("el id lleva el remoto dentro: reimportar no duplica", () => {
  assert.equal(idDeTorneo("abc123"), "ltl-abc123");
  assert.equal(vuestrosEnElTorneo(torneo, clasificacion, jugadores)!.id, "ltl-abc123");
});

test("la fecha se recorta a día: la columna es `date`", () => {
  assert.equal(vuestrosEnElTorneo(torneo, clasificacion, jugadores)!.date, "2026-10-11");
});

test("nickNormal", () => {
  assert.equal(nickNormal("  IbaiM "), "ibaim");
  assert.equal(nickNormal(null), "");
  assert.equal(nickNormal(undefined), "");
});

/* --------------------------------------------------------------- resumen */

test("el resumen distingue «no jugó» de «no lo sabemos»", () => {
  const r = importarTorneos([
    { torneo, clasificacion },
    { torneo: { ...torneo, id: "zzz" }, clasificacion: [{ player: "nadie", placing: 1 }] },
  ], jugadores);

  assert.equal(r.torneos.length, 1);
  assert.equal(r.sinNadie, 1);
  // Cristina no tiene nick: no es que no jugara, es que no se la ha buscado.
  assert.deepEqual(r.sinNick, ["Cristina"]);
});

/* ------------------------------------------------------------------ v0.127 */

test("v0.127 — las rondas de un jugador: resultado y mazo rival, sin que salga el nick de nadie de fuera", async () => {
  const { rondasDeJugador } = await import("../src/lib/limitlessImport.ts");
  const clasif = [
    { player: "ibaim", deck: { id: "dragapult-ex", name: "Dragapult ex" } },
    { player: "Rival1", deck: { id: "gardevoir-ex", name: "Gardevoir ex" } },
    { player: "rival2", deck: { id: "raging-bolt", name: "Raging Bolt" } },
    { player: "sinmazo", deck: null },
    { player: "alexx", deck: { id: "gholdengo-ex", name: "Gholdengo ex" } },
  ];
  const pares = [
    { round: 2, phase: 1, table: 4, player1: "rival2", player2: "IbaiM", winner: "rival2" },
    { round: 1, phase: 1, table: 1, player1: "ibaim", player2: "rival1", winner: "ibaim" },
    { round: 1, phase: 1, table: 2, player1: "otro", player2: "otra", winner: "otro" }, // no es mía
    { round: 3, phase: 1, table: 3, player1: "ibaim", player2: "sinmazo", winner: 0 },
    { round: 4, phase: 1, table: 9, player1: "ibaim", player2: null, winner: "ibaim" },
    { round: 5, phase: 1, table: 2, player1: "alexx", player2: "ibaim", winner: -1 },
  ];
  const jugadores = [{ id: "p-ibai", name: "Ibai", limitlessHandle: "IbaiM" }, { id: "p-alex", name: "Alex", limitlessHandle: "Alexx" }];
  const r = rondasDeJugador(pares, clasif, "IbaiM", jugadores);
  assert.deepEqual(r.map((x) => [x.ronda, x.resultado, x.rivalSlug, x.bye, x.sinJugar, x.rivalPlayerId]), [
    [1, "a", "gardevoir-ex", false, false, null],
    [2, "b", "raging-bolt", false, false, null],
    [3, "tie", null, false, false, null], // el rival no tenía mazo identificado
    [4, "a", null, true, false, null], // bye
    [5, "b", "gholdengo-ex", false, false, "p-alex"], // doble derrota, contra alguien del grupo
  ]);
  // Ningún nick de fuera en lo que sale.
  assert.ok(!JSON.stringify(r).toLowerCase().includes("rival1"));
  assert.deepEqual(rondasDeJugador(pares, clasif, "nadie"), []);
  assert.deepEqual(rondasDeJugador(pares, clasif, ""), []);
});

test("v0.127 — el cuadro en directo: la API lo cuenta como UNA ronda; aquí se numera seguido, T8 → T4 → T2", async () => {
  const { rondasDeJugador } = await import("../src/lib/limitlessImport.ts");
  const clasif = [{ player: "yo", deck: { id: "a", name: "A" } }, { player: "x", deck: { id: "mx", name: "MX" } },
    { player: "y", deck: { id: "my", name: "MY" } }, { player: "z", deck: { id: "mz", name: "MZ" } }];
  const pares = [
    { round: 6, phase: 2, match: "T2-1", player1: "z", player2: "yo", winner: "z" },
    { round: 5, phase: 1, table: 1, player1: "yo", player2: "x", winner: "yo" },
    { round: 6, phase: 2, match: "T8-3", player1: "yo", player2: "x", winner: "yo" },
    { round: 6, phase: 2, match: "T4-1", player1: "y", player2: "yo", winner: "yo" },
  ];
  const r = rondasDeJugador(pares, clasif, "yo");
  assert.deepEqual(r.map((x) => [x.ronda, x.fase, x.resultado, x.rivalSlug]), [
    [5, 1, "a", "mx"], [6, 2, "a", "mx"], [7, 2, "a", "my"], [8, 2, "b", "mz"],
  ]);
});

test("v0.127 — derrota automática por no presentarse, y una partida sin ganador todavía no se inventa", async () => {
  const { rondasDeJugador } = await import("../src/lib/limitlessImport.ts");
  const r = rondasDeJugador([
    { round: 1, phase: 1, player1: "yo", player2: "", winner: null }, // sin rival y sin ganar: no presentado
    { round: 2, phase: 1, player1: "yo", player2: "x", winner: null }, // en curso
    { round: 3, phase: 1, player1: "x", player2: "yo", winner: "x" },
  ], [], "yo");
  assert.deepEqual(r.map((x) => [x.ronda, x.resultado, x.bye, x.sinJugar]), [[1, "b", false, true], [3, "b", false, false]]);
});
