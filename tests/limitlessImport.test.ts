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
