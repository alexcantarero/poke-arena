import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dedupeKeyOf, detectDelimiter, matchupsOf, parseDate, parseLiveHistory,
  parseResult, parseScore, statsByDeck, winRateOf,
} from "../src/lib/ptcglive.ts";

/* ------------------------------------------------------------- separador -- */

test("el tabulador manda: es lo que sale de pegar una hoja de cálculo", () => {
  assert.equal(detectDelimiter("a\tb\tc"), "\t");
  // Aunque la línea también tenga comas.
  assert.equal(detectDelimiter("a\tb, c\td"), "\t");
});

test("el punto y coma antes que la coma, por el Excel en español", () => {
  assert.equal(detectDelimiter("a;b;c"), ";");
  assert.equal(detectDelimiter("a,b,c"), ",");
});

/* ---------------------------------------------------------------- fechas -- */

test("fechas en las tres formas que escribe la gente", () => {
  assert.equal(parseDate("2026-09-14"), "2026-09-14");
  assert.equal(parseDate("14/09/2026"), "2026-09-14");
  assert.equal(parseDate("14-9-2026"), "2026-09-14");
  assert.equal(parseDate("  1/3/26  "), "2026-03-01");
});

test("día primero, no mes: esto lo escribe gente en español", () => {
  // 03/09 es 3 de septiembre, no 9 de marzo.
  assert.equal(parseDate("03/09/2026"), "2026-09-03");
});

test("lo que no se entiende se rechaza en vez de inventarse", () => {
  assert.equal(parseDate("ayer"), null);
  assert.equal(parseDate("32/01/2026"), null);
  assert.equal(parseDate("14/13/2026"), null);
  assert.equal(parseDate(""), null);
});

/* ------------------------------------------------------------ resultados -- */

test("el resultado admite español, inglés y abreviaturas", () => {
  for (const s of ["V", "w", "Win", "gana", "victoria", "1"]) assert.equal(parseResult(s), "w");
  for (const s of ["D", "l", "loss", "pierde", "derrota", "0"]) assert.equal(parseResult(s), "l");
  for (const s of ["E", "t", "tie", "draw", "empate"]) assert.equal(parseResult(s), "d");
});

test("la D es derrota y no draw", () => {
  // Es la ambigüedad del formato y hay que elegir: quien escribe esto escribe
  // en español, y los empates en TCG Live son rarísimos.
  assert.equal(parseResult("D"), "l");
  assert.equal(parseResult("draw"), "d");
});

test("acentos y mayúsculas dan igual", () => {
  // `plano()` quita tildes antes de comparar, así que "PÉRDIDA" y "perdida"
  // son la misma palabra. Es justo lo que hace falta: nadie escribe su hoja
  // con el mismo criterio dos veces.
  assert.equal(parseResult(" Victoria "), "w");
  assert.equal(parseResult("PÉRDIDA"), "l");
  assert.equal(parseResult("perdida"), "l");
  // Lo que de verdad no está en ninguna lista sí devuelve null.
  assert.equal(parseResult("ni idea"), null);
});

test("marcadores", () => {
  assert.deepEqual(parseScore("2-1"), [2, 1]);
  assert.deepEqual(parseScore("2 - 0"), [2, 0]);
  assert.deepEqual(parseScore("1/2"), [1, 2]);
  assert.equal(parseScore("2-1-0"), null);
  assert.equal(parseScore("9-9"), null);
  assert.equal(parseScore("hola"), null);
});

/* ----------------------------------------------------------- el importador -- */

test("con cabecera reconoce las columnas por el nombre", () => {
  const r = parseLiveHistory(
    "fecha, mi mazo, mazo rival, resultado, rival, marcador\n" +
    "2026-09-14, Dragapult ex, Gardevoir ex, V, Marta, 2-1",
    "p1",
  );
  assert.equal(r.problems.length, 0);
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].myDeck, "Dragapult ex");
  assert.equal(r.rows[0].opponentDeck, "Gardevoir ex");
  assert.equal(r.rows[0].opponent, "Marta");
  assert.equal(r.rows[0].result, "w");
  assert.equal(r.rows[0].gamesWon, 2);
  assert.equal(r.rows[0].gamesLost, 1);
});

test("la cabecera puede venir en otro orden", () => {
  const r = parseLiveHistory(
    "resultado;fecha;mazo rival;mi mazo\nV;2026-09-14;Gardevoir ex;Dragapult ex",
    "p1",
  );
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].myDeck, "Dragapult ex");
  assert.equal(r.rows[0].opponentDeck, "Gardevoir ex");
  assert.equal(r.rows[0].result, "w");
});

test("sin cabecera se lee por el orden por defecto", () => {
  const r = parseLiveHistory("2026-09-14, Dragapult ex, Gardevoir ex, V", "p1");
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].myDeck, "Dragapult ex");
  assert.equal(r.rows[0].result, "w");
});

test("una sola columna reconocida no es una cabecera", () => {
  // "fecha" sola podría ser el nombre de un mazo. Con menos de dos aciertos
  // la línea se trata como datos, no como cabecera.
  const r = parseLiveHistory("fecha, algo, otra cosa, V", "p1");
  assert.equal(r.rows.length, 0);
  assert.equal(r.problems.length, 1);
  assert.match(r.problems[0].why, /fecha/);
});

test("el marcador manda sobre la letra", () => {
  // Alguien escribe "D" pero pone 2-1: se cree a los números.
  const r = parseLiveHistory("2026-09-14, Dragapult ex, Gardevoir ex, D, , 2-1", "p1");
  assert.equal(r.rows[0].result, "w");
});

test("sin marcador y sin letra, la fila se queda fuera y se dice por qué", () => {
  const r = parseLiveHistory("2026-09-14, Dragapult ex, Gardevoir ex, ?????", "p1");
  assert.equal(r.rows.length, 0);
  assert.equal(r.problems.length, 1);
  assert.match(r.problems[0].why, /resultado/);
});

test("una fila mala no tira las demás", () => {
  const r = parseLiveHistory(
    [
      "2026-09-14, Dragapult ex, Gardevoir ex, V",
      "esto no es una partida",
      "2026-09-15, Dragapult ex, Charizard ex, D",
    ].join("\n"),
    "p1",
  );
  assert.equal(r.rows.length, 2);
  assert.equal(r.problems.length, 1);
  assert.equal(r.problems[0].line, 2);
});

test("las líneas vacías y los comentarios se saltan", () => {
  const r = parseLiveHistory(
    "# mis partidas\n\n2026-09-14, Dragapult ex, Gardevoir ex, V\n\n",
    "p1",
  );
  assert.equal(r.rows.length, 1);
  assert.equal(r.problems.length, 0);
});

test("la misma partida dos veces en el mismo texto entra una sola vez", () => {
  const linea = "2026-09-14, Dragapult ex, Gardevoir ex, V, Marta, 2-1";
  const r = parseLiveHistory(`${linea}\n${linea}`, "p1");
  assert.equal(r.rows.length, 1);
  assert.equal(r.duplicatesInPaste, 1);
});

test("dos partidas iguales pero de días distintos no son la misma", () => {
  const r = parseLiveHistory(
    "2026-09-14, Dragapult ex, Gardevoir ex, V\n2026-09-15, Dragapult ex, Gardevoir ex, V",
    "p1",
  );
  assert.equal(r.rows.length, 2);
  assert.equal(r.duplicatesInPaste, 0);
});

test("la clave lleva el jugador dentro: dos personas pueden importar la misma partida", () => {
  const base = {
    date: "2026-09-14", myDeck: "Dragapult ex", opponentDeck: "Gardevoir ex",
    opponent: "", result: "w" as const, gamesWon: 2, gamesLost: 1, format: "",
  };
  assert.notEqual(dedupeKeyOf("p1", base), dedupeKeyOf("p2", base));
});

test("la clave ignora mayúsculas y acentos del mazo", () => {
  const a = { date: "2026-09-14", myDeck: "Dragapult ex", opponentDeck: "", opponent: "",
    result: "w" as const, gamesWon: null, gamesLost: null, format: "" };
  const b = { ...a, myDeck: "DRAGAPULT EX" };
  assert.equal(dedupeKeyOf("p1", a), dedupeKeyOf("p1", b));
});

test("pegado desde una hoja de cálculo, con tabuladores", () => {
  const r = parseLiveHistory(
    "Fecha\tMi mazo\tMazo rival\tResultado\n2026-09-14\tDragapult ex\tGardevoir ex\tV",
    "p1",
  );
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].opponentDeck, "Gardevoir ex");
});

/* --------------------------------------------------------- estadísticas -- */

test("el empate vale media victoria, igual que en la liga", () => {
  assert.equal(winRateOf(1, 1, 0), 0.5);
  assert.equal(winRateOf(1, 0, 1), 0.75);
  assert.equal(winRateOf(0, 0, 0), null);
});

test("agrupa por mazo y ordena por uso", () => {
  const rows = [
    { myDeck: "A", result: "w" as const },
    { myDeck: "A", result: "l" as const },
    { myDeck: "B", result: "w" as const },
    { myDeck: "A", result: "w" as const },
  ];
  const s = statsByDeck(rows);
  assert.equal(s[0].deck, "A");
  assert.equal(s[0].played, 3);
  assert.equal(s[0].wins, 2);
  assert.equal(s[1].deck, "B");
});

test("los emparejamientos son solo del mazo elegido", () => {
  const rows = [
    { myDeck: "A", opponentDeck: "X", result: "w" as const },
    { myDeck: "A", opponentDeck: "X", result: "l" as const },
    { myDeck: "A", opponentDeck: "Y", result: "w" as const },
    { myDeck: "B", opponentDeck: "X", result: "w" as const },
  ];
  const m = matchupsOf(rows, "A");
  assert.equal(m.length, 2);
  assert.equal(m[0].against, "X");
  assert.equal(m[0].played, 2);
  assert.equal(m[0].winRate, 0.5);
});

test("minPlayed quita el ruido de una sola partida", () => {
  const rows = [
    { myDeck: "A", opponentDeck: "X", result: "w" as const },
    { myDeck: "A", opponentDeck: "X", result: "w" as const },
    { myDeck: "A", opponentDeck: "Y", result: "w" as const },
  ];
  assert.equal(matchupsOf(rows, "A", 2).length, 1);
});

test("sin mazo del rival, el cruce se llama «Sin identificar» en vez de perderse", () => {
  const m = matchupsOf([{ myDeck: "A", opponentDeck: "", result: "w" as const }], "A");
  assert.equal(m[0].against, "Sin identificar");
});
