import { test } from "node:test";
import assert from "node:assert/strict";
import {
  coverageOf, detectMode, matchArchetype, norm, parseStandings, parseSummary,
  type KnownArchetype,
} from "../src/lib/standings.ts";

/* El catálogo que tendría la liga después de pulsar «Actualizar catálogo». */
const KNOWN: KnownArchetype[] = [
  { id: "a-garde", name: "Gardevoir ex", main: "gardevoir" },
  { id: "a-bolt", name: "Raging Bolt Ogerpon", main: "raging-bolt", secondary: "ogerpon" },
  { id: "a-dragapult", name: "Dragapult Dusknoir", main: "dragapult", secondary: "dusknoir" },
  { id: "a-charizard", name: "Charizard ex", main: "charizard" },
  { id: "a-ogerpon", name: "Ogerpon", main: "ogerpon" },
];

/* --------------------------------------------------------- normalizar -- */

test("norm: quita acentos, mayúsculas y todo lo que no sea letra o número", () => {
  assert.equal(norm("Gardevoir ex"), "gardevoirex");
  assert.equal(norm("N's Zoroark ex"), "nszoroarkex");
  assert.equal(norm("  Raging-Bolt  "), "ragingbolt");
  assert.equal(norm(""), "");
});

/* ------------------------------------------------------ casar el mazo -- */

test("matchArchetype: ancla al final, así que el nombre de la persona no estorba", () => {
  const m = matchArchetype("Tord Reklev NO Gardevoir ex", KNOWN);
  assert.equal(m?.archetype.id, "a-garde");
});

test("matchArchetype: gana el más largo", () => {
  // "Ogerpon" también casa, pero el arquetipo de verdad es el de dos.
  const m = matchArchetype("Alguien Raging Bolt Ogerpon", KNOWN);
  assert.equal(m?.archetype.id, "a-bolt");
});

test("matchArchetype: un nombre suelto no casa con nada", () => {
  assert.equal(matchArchetype("Juan Pérez", KNOWN), null);
});

/* -------------------------------------------------------- clasificación -- */

const LIMITLESS = `
Place\tName\tCountry\tDeck\tRecord\tPoints
1\tTord Reklev\tNO\tGardevoir ex\t14-2-2\t44
2\tAndrea Iannuzzi\tIT\tRaging Bolt Ogerpon\t13-2-3\t42
3\tMarco Hemantha\tDE\tDragapult Dusknoir\t13-3-2\t41
4\tSophie Leclerc\tFR\tGardevoir ex\t12-3-3\t39
`;

test("clasificación de Limitless: salen los puestos, los mazos y los récords", () => {
  const r = parseStandings(LIMITLESS, KNOWN);
  assert.equal(r.entries.length, 4);
  assert.deepEqual(r.entries.map((e) => e.placement), [1, 2, 3, 4]);
  assert.deepEqual(r.entries.map((e) => e.archetypeId),
    ["a-garde", "a-bolt", "a-dragapult", "a-garde"]);
  assert.deepEqual(r.entries[0], {
    placement: 1, copies: 1, deck: "Gardevoir ex", archetypeId: "a-garde",
    wins: 14, losses: 2, ties: 2,
  });
});

test("la fila que sale NO tiene dónde meter un nombre", () => {
  const r = parseStandings(LIMITLESS, KNOWN);
  const serializado = JSON.stringify(r.entries);
  for (const nombre of ["Tord", "Reklev", "Iannuzzi", "Hemantha", "Leclerc", "Sophie"]) {
    assert.ok(!serializado.includes(nombre), `se ha colado «${nombre}»`);
  }
  // Y las claves son exactamente estas, ni una más.
  assert.deepEqual(
    Object.keys(r.entries[0]).sort(),
    ["archetypeId", "copies", "deck", "losses", "placement", "ties", "wins"],
  );
});

test("sin separadores: una línea con espacios simples también se entiende", () => {
  const r = parseStandings("1 Tord Reklev NO Gardevoir ex 14-2-2 44", KNOWN);
  assert.equal(r.entries.length, 1);
  assert.equal(r.entries[0].deck, "Gardevoir ex");
  assert.equal(r.entries[0].wins, 14);
});

test("récord de dos cifras sin empates: los empates quedan en 0, no en null", () => {
  const r = parseStandings("7 Alguien ES Charizard ex 6-2", KNOWN);
  assert.equal(r.entries[0].ties, 0);
});

test("si el mazo va después del récord, también se pilla", () => {
  const r = parseStandings("1 Alguien Apellido 14-2-2 Gardevoir ex", KNOWN);
  assert.equal(r.entries[0].archetypeId, "a-garde");
});

test("las cabeceras de la tabla no cuentan como fila", () => {
  const r = parseStandings(LIMITLESS, KNOWN);
  assert.equal(r.skipped, 0);
});

test("un puesto repetido se queda con el primero", () => {
  const r = parseStandings("1 A ES Gardevoir ex 5-0\n1 B ES Charizard ex 5-0", KNOWN);
  assert.equal(r.entries.length, 1);
  assert.equal(r.entries[0].deck, "Gardevoir ex");
  assert.equal(r.skipped, 1);
});

/* ------------------------------------------ el filtro que tira nombres -- */

test("una cadena desconocida que sale una sola vez se descarta", () => {
  // Nadie del catálogo casa: son cuatro personas con cuatro mazos distintos y
  // ninguno repetido. Todo fuera.
  const texto = [
    "1 Ana Gómez ES Mazo Inventado Uno 5-0",
    "2 Luis Prado ES Mazo Inventado Dos 4-1",
    "3 Eva Ruiz ES Mazo Inventado Tres 4-1",
  ].join("\n");
  const r = parseStandings(texto, []);
  assert.equal(r.entries.length, 0);
  assert.equal(r.descartadas, 3);
  assert.deepEqual(r.nuevos, []);
});

test("un mazo nuevo se acepta en cuanto sale en tres puestos distintos", () => {
  const texto = [
    "1 Ana Gómez ES Mega Gengar ex 5-0",
    "2 Luis Prado FR Mega Gengar ex 4-1",
    "3 Eva Ruiz IT Mega Gengar ex 4-1",
  ].join("\n");
  const r = parseStandings(texto, []);
  assert.equal(r.entries.length, 3);
  assert.deepEqual(r.nuevos, ["Mega Gengar ex"]);
  assert.equal(r.entries[0].deck, "Mega Gengar ex");
  assert.equal(r.entries[0].archetypeId, null);
  assert.equal(r.descartadas, 0);
});

test("dos veces no basta: el umbral son tres", () => {
  const texto = [
    "1 Ana Gómez ES Mega Gengar ex 5-0",
    "2 Luis Prado FR Mega Gengar ex 4-1",
  ].join("\n");
  const r = parseStandings(texto, []);
  assert.equal(r.entries.length, 0);
  assert.equal(r.descartadas, 2);
});

test("el apellido pegado al mazo no se lleva por delante el arquetipo", () => {
  const r = parseStandings("1 Pedro Gardevoir ES Charizard ex 6-1", KNOWN);
  assert.equal(r.entries[0].archetypeId, "a-charizard");
});

/* ------------------------------------------------ el formato de Frankfurt -- */

/*
   El que se copia de la clasificación de un Regional:

     Puesto · Nombre · Nacionalidad · Puntos · Récord · OPW% · OOPW% · Mazo

   Tiene dos trampas respecto al formato de Limitless online: el mazo va
   **detrás** de los porcentajes, no delante del récord, y entre el nombre y
   el récord hay un número suelto (los match points) que podría confundirse
   con un puesto.
*/
const FRANKFURT = [
  "1 Tomasz Chałupka PL 49 16 - 1 - 1 62.22% 62.84% alakazamdusknoir",
  "2 Mateusz Łaszkiewicz PL 43 14 - 3 - 1 61.66% 62.47% alakazamdusknoir",
  "3 Ander Etxebarria ES 41 13 - 2 - 2 59.10% 60.11% grimmsnarlfroslass",
].join("\n");

const KNOWN_FR: KnownArchetype[] = [
  { id: "a-alakazam", name: "Alakazam Dusknoir" },
  { id: "a-grimm", name: "Grimmsnarl Froslass" },
];

test("Frankfurt: el mazo va detrás de los porcentajes y aun así se pilla", () => {
  const r = parseStandings(FRANKFURT, KNOWN_FR);
  assert.equal(r.entries.length, 3);
  assert.deepEqual(r.entries.map((e) => e.archetypeId),
    ["a-alakazam", "a-alakazam", "a-grimm"]);
  assert.deepEqual(r.entries[0], {
    placement: 1, copies: 1, deck: "Alakazam Dusknoir", archetypeId: "a-alakazam",
    wins: 16, losses: 1, ties: 1,
  });
  assert.equal(r.descartadas, 0);
});

test("Frankfurt: los match points no se confunden con nada", () => {
  const r = parseStandings(FRANKFURT, KNOWN_FR);
  // 49 puntos, récord 16-1-1. Si el 49 se hubiera colado como récord o como
  // puesto, esto no cuadraría.
  assert.equal(r.entries[0].wins! * 3 + r.entries[0].ties!, 49);
  assert.equal(r.entries[1].wins! * 3 + r.entries[1].ties!, 43);
  assert.equal(r.entries[2].wins! * 3 + r.entries[2].ties!, 41);
});

test("Frankfurt: de la clasificación no sale ni un nombre ni una nacionalidad", () => {
  const r = parseStandings(FRANKFURT, KNOWN_FR);
  const serializado = JSON.stringify(r);
  for (const dato of ["Tomasz", "Chałupka", "Mateusz", "Łaszkiewicz", "Ander", "Etxebarria"]) {
    assert.ok(!serializado.includes(dato), `se ha colado «${dato}»`);
  }
  // La nacionalidad también es un dato de la persona: fuera.
  assert.ok(!/"PL"|"ES"/.test(serializado));
});

/* -------------------------------------------------------------- resumen -- */

test("resumen: número detrás", () => {
  const r = parseSummary("Gardevoir ex 6\nCharizard ex 5\nDragapult Dusknoir 4", KNOWN);
  assert.deepEqual(r.entries.map((e) => [e.deck, e.copies]), [
    ["Gardevoir ex", 6], ["Charizard ex", 5], ["Dragapult Dusknoir", 4],
  ]);
  assert.ok(r.entries.every((e) => e.placement === null));
});

test("resumen: número delante, con guion o con x", () => {
  const r = parseSummary("6 Gardevoir ex\nCharizard ex - 5\nDragapult Dusknoir x4", KNOWN);
  assert.deepEqual(r.entries.map((e) => e.copies), [6, 5, 4]);
  assert.deepEqual(r.entries.map((e) => e.archetypeId),
    ["a-garde", "a-charizard", "a-dragapult"]);
});

test("resumen: una línea sin número no dice nada y se salta", () => {
  const r = parseSummary("Gardevoir ex\nCharizard ex 5", KNOWN);
  assert.equal(r.entries.length, 1);
  assert.equal(r.skipped, 1);
});

test("resumen: un mazo que no está en el catálogo se guarda igual, por su nombre", () => {
  const r = parseSummary("Mega Gengar ex 3", KNOWN);
  assert.equal(r.entries[0].deck, "Mega Gengar ex");
  assert.equal(r.entries[0].archetypeId, null);
  assert.deepEqual(r.nuevos, ["Mega Gengar ex"]);
});

/* ------------------------------------------------------------ el resto -- */

test("detectMode: una clasificación que empieza en 1, 2, 3", () => {
  assert.equal(detectMode(LIMITLESS), "standings");
});

test("detectMode: un desglose por mazos", () => {
  assert.equal(detectMode("Gardevoir ex 6\nCharizard ex 5\nDragapult Dusknoir 4"), "summary");
});

test("detectMode: sin nada que mirar, clasificación", () => {
  assert.equal(detectMode(""), "standings");
});

test("coverageOf: hasta qué puesto llega lo pegado", () => {
  const r = parseStandings(LIMITLESS, KNOWN);
  assert.equal(coverageOf(r.entries), 4);
  assert.equal(coverageOf(parseSummary("Gardevoir ex 6", KNOWN).entries), null);
});
