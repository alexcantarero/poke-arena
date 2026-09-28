import { test } from "node:test";
import assert from "node:assert/strict";
import {
  conCuotaOnline, pasoDiaDos, puntos, resumenGrupo, type ResultadoGrupo,
} from "../src/lib/metaGrupo.ts";
import { insigniasDe } from "../src/lib/metaBadges.ts";
import { umbralesDe } from "../src/lib/estructura.ts";

/** Lo que hace quien llama de verdad: una línea. */
const umbral = (playerCount: number | null, kind: string) =>
  umbralesDe(playerCount, kind)?.diaDos?.puntos ?? null;

const res = (
  playerId: string, tournamentId: string, archetypeName: string,
  wins: number, losses: number, ties: number,
  { playerCount = 3342 as number | null, topCut = 8, kind = "regional", placement = null as number | null, archetypeId = null as string | null } = {},
): ResultadoGrupo => ({
  playerId, tournamentId, topCut, umbralDiaDos: umbral(playerCount, kind),
  archetypeId, archetypeName, main: archetypeName.toLowerCase().split(" ")[0], secondary: "",
  placement, wins, losses, ties,
});

/* ------------------------------------------------------------- puntos -- */

test("puntos: victoria 3, empate 1, derrota 0", () => {
  assert.equal(puntos({ wins: 5, ties: 1 }), 16);
  assert.equal(puntos({ wins: 4, ties: 4 }), 16);
  assert.equal(puntos({ wins: 8, ties: 0 }), 24);
});

/* ------------------------------------------------------------ Día dos -- */

test("el Día 2 se deduce del récord y de la asistencia, no se apunta a mano", () => {
  // 3.342 personas → fase uno de 8 rondas, umbral 16 puntos.
  assert.equal(pasoDiaDos(res("a", "t1", "Dragapult", 5, 2, 1)), true);   // 16
  assert.equal(pasoDiaDos(res("b", "t1", "Dragapult", 5, 3, 0)), false);  // 15
  assert.equal(pasoDiaDos(res("c", "t1", "Dragapult", 4, 0, 4)), true);   // 16
});

test("sin asistencia no se puede deducir, y devuelve nulo — no falso", () => {
  assert.equal(pasoDiaDos(res("a", "t1", "Dragapult", 7, 1, 0, { playerCount: null })), null);
});

test("un torneo de una sola fase no tiene Día 2 al que pasar", () => {
  // 50 personas: siete rondas del tirón, sin fase dos.
  assert.equal(pasoDiaDos(res("a", "t1", "Dragapult", 6, 1, 0, { playerCount: 50 })), null);
});

test("el tipo de torneo importa: la misma gente, otra tabla de rondas", () => {
  // Una League Cup no tiene fase dos por muchos que sean.
  assert.equal(pasoDiaDos(res("a", "t1", "Dragapult", 7, 1, 0,
    { playerCount: 3342, kind: "league_cup" })), null);
  // Y un Regional con la misma asistencia sí.
  assert.equal(pasoDiaDos(res("a", "t1", "Dragapult", 7, 1, 0,
    { playerCount: 3342, kind: "regional" })), true);
});

/* ----------------------------------------------------------- agrupar -- */

test("agrupa por arquetipo y cuenta el campo", () => {
  const r = resumenGrupo([
    res("ibai", "t1", "Dragapult", 6, 2, 0),
    res("alex", "t1", "Dragapult", 5, 2, 1),
    res("marta", "t1", "Slowking", 4, 4, 0),
  ]);
  assert.equal(r.resultados, 3);
  assert.equal(r.torneos, 1);
  assert.equal(r.campo.decks, 3);
  const drag = r.filas.find((f) => f.name === "Dragapult")!;
  assert.equal(drag.field, 2);
  assert.equal(drag.day2, 2);       // 18 y 16 puntos, los dos pasan
  const slow = r.filas.find((f) => f.name === "Slowking")!;
  assert.equal(slow.day2, 0);       // 12 puntos
});

test("el mismo jugador dos veces en el mismo torneo cuenta una", () => {
  const r = resumenGrupo([
    res("ibai", "t1", "Dragapult", 6, 2, 0),
    res("ibai", "t1", "Slowking", 6, 2, 0),
  ]);
  assert.equal(r.resultados, 1);
  assert.equal(r.filas.length, 1);
  assert.equal(r.filas[0].name, "Dragapult");
});

test("el mismo jugador en dos torneos sí cuenta dos veces", () => {
  const r = resumenGrupo([
    res("ibai", "t1", "Dragapult", 6, 2, 0),
    res("ibai", "t2", "Dragapult", 5, 3, 0),
  ]);
  assert.equal(r.resultados, 2);
  assert.equal(r.torneos, 2);
  assert.equal(r.filas[0].field, 2);
});

test("el mismo mazo con id y sin id no se parte en dos filas si el nombre coincide", () => {
  const r = resumenGrupo([
    res("a", "t1", "Dragapult", 6, 2, 0, { archetypeId: "a1" }),
    res("b", "t2", "Dragapult", 6, 2, 0, { archetypeId: "a1" }),
  ]);
  assert.equal(r.filas.length, 1);
  assert.equal(r.filas[0].field, 2);
});

/* -------------------------------------------------- nulo no es cero -- */

test("si de ningún resultado se pudo deducir el Día 2, la conversión es nula", () => {
  const r = resumenGrupo([
    res("a", "t1", "Dragapult", 6, 1, 0, { playerCount: 50 }),
    res("b", "t1", "Slowking", 5, 2, 0, { playerCount: 50 }),
  ]);
  assert.equal(r.campo.day2, null);
  assert.ok(r.filas.every((f) => f.day2 === null));
  assert.equal(r.conDiaDos, 0);
  // Y las insignias de rendimiento se callan, en vez de coronar a nadie.
  const i = insigniasDe(r.filas, r.campo);
  assert.equal(i.top, null);
  assert.equal(i.decepcion, null);
});

test("mezcla: solo cuentan para la conversión los resultados de los que se sabe", () => {
  const r = resumenGrupo([
    res("a", "t1", "Dragapult", 6, 2, 0),                          // sabemos: pasa
    res("b", "t2", "Dragapult", 6, 1, 0, { playerCount: 50 }),     // no sabemos
  ]);
  const drag = r.filas[0];
  assert.equal(drag.field, 2);
  assert.equal(drag.day2, 1);
  assert.equal(r.conDiaDos, 1);
});

/* --------------------------------------------------------- el corte -- */

test("el corte cuenta los puestos dentro del top cut, y el mejor puesto se guarda", () => {
  const r = resumenGrupo([
    res("a", "t1", "Dragapult", 12, 2, 0, { placement: 3 }),
    res("b", "t1", "Dragapult", 11, 3, 0, { placement: 40 }),
  ]);
  assert.equal(r.filas[0].cut, 1);
  assert.equal(r.filas[0].bestFinish, 3);
  assert.equal(r.campo.topCut, 1);
});

test("sin puesto apuntado no se inventa ni corte ni mejor resultado", () => {
  const r = resumenGrupo([res("a", "t1", "Dragapult", 6, 2, 0)]);
  assert.equal(r.filas[0].cut, 0);
  assert.equal(r.filas[0].bestFinish, null);
});

/* ------------------------------------------------------ cuota online -- */

test("conCuotaOnline casa por nombre normalizado", () => {
  const filas = resumenGrupo([res("a", "t1", "Dragapult", 6, 2, 0)]).filas;
  const conCuota = conCuotaOnline(filas, [{ name: "dragapult", share: 0.101 }]);
  assert.equal(conCuota[0].onlineShare, 0.101);
});

test("lo que no casa se queda sin comparación, no con un cero", () => {
  const filas = resumenGrupo([res("a", "t1", "Mazo Raro", 6, 2, 0)]).filas;
  const conCuota = conCuotaOnline(filas, [{ name: "Dragapult", share: 0.101 }]);
  assert.equal(conCuota[0].onlineShare, null);
});

/* ------------------------------------------------------------- vacío -- */

test("sin resultados no se rompe nada", () => {
  const r = resumenGrupo([]);
  assert.deepEqual(r.filas, []);
  assert.equal(r.resultados, 0);
  assert.equal(r.campo.day2, null);
  const i = insigniasDe(r.filas, r.campo);
  assert.equal(i.top, null);
});

/* --------------------------- lo que hace que el selector salga barato -- */

test("lo del grupo entra en el mismo motor de insignias que lo del mundo", () => {
  // Doce resultados: suficiente para que salgan insignias sin bajar umbrales.
  const filas: ResultadoGrupo[] = [];
  for (let i = 0; i < 16; i++) {
    // Dragapult: mucha gente, casi nadie pasa.
    filas.push(res(`d${i}`, "t1", "Dragapult", 4, 4, 0));
  }
  for (let i = 0; i < 6; i++) {
    // Slowking: pocos, casi todos pasan.
    filas.push(res(`s${i}`, "t1", "Slowking", 6, 2, 0));
  }
  const r = resumenGrupo(filas);
  const ins = insigniasDe(r.filas, r.campo);
  assert.equal(ins.top?.fila.name, "Slowking");
  assert.equal(ins.decepcion?.fila.name, "Dragapult");
  assert.equal(r.resultados, 22);
});
