import { test } from "node:test";
import assert from "node:assert/strict";
import { mejoresListas, normalizarLista, totalCartas } from "../src/lib/listasLimitless.ts";

const LISTA = {
  pokemon: [{ count: 4, name: "Dreepy", set: "TWM", number: "128" }, { count: 3, name: "Dragapult ex", set: "TWM", number: 130 }],
  trainer: [{ count: 4, name: "Arven", set: "SVI", number: "166" }],
  energy: [{ count: 5, name: "Basic Psychic Energy", set: "SVE", number: "5" }],
};

test("lee la forma esperada", () => {
  const l = normalizarLista(LISTA)!;
  assert.equal(l.pokemon.length, 2);
  assert.equal(l.pokemon[1].number, "130"); // número como texto aunque llegue como número
  assert.equal(totalCartas(l), 16);
});

test("LA REGLA: un formato desconocido es null, no un error", () => {
  // El formato de la lista no está documentado para Pokémon: si llega otra
  // cosa, la pantalla dice «lista no disponible» y no se rompe.
  assert.equal(normalizarLista(null), null);
  assert.equal(normalizarLista("60 cartas"), null);
  assert.equal(normalizarLista({ cards: [] }), null);
  assert.equal(normalizarLista({ pokemon: [{ nombre: "x" }] }), null);
});

test("las cartas mal formadas se descartan sin tumbar la lista", () => {
  const l = normalizarLista({ pokemon: [{ count: 0, name: "X" }, { count: 2, name: "" }, { count: 1, name: "Pidgey" }] })!;
  assert.deepEqual(l.pokemon.map((c) => c.name), ["Pidgey"]);
});

const T = (id: string, players: number) => ({ id, name: `T${id}`, date: "2026-10-10T18:00:00Z", players });
const C = (placing: number, deck: string, conLista = true) => ({
  placing, record: { wins: 6, losses: 1, ties: 0 }, deck: { id: deck }, decklist: conLista ? LISTA : undefined,
  name: "Nombre Real", player: "usuario",
});

test("mejor puesto primero y, a igual puesto, el torneo más grande", () => {
  const r = mejoresListas([
    { torneo: T("a", 40), clasificacion: [C(2, "dragapult")] },
    { torneo: T("b", 200), clasificacion: [C(1, "dragapult")] },
    { torneo: T("c", 300), clasificacion: [C(2, "dragapult")] },
  ], "dragapult");
  assert.deepEqual(r.map((x) => `${x.torneoId}#${x.puesto}`), ["b#1", "c#2", "a#2"]);
});

test("solo el arquetipo pedido, y las que traen lista delante", () => {
  const r = mejoresListas([{ torneo: T("a", 50), clasificacion: [C(1, "dragapult", false), C(3, "dragapult"), C(2, "gardevoir")] }], "dragapult");
  assert.deepEqual(r.map((x) => x.puesto), [3, 1]);
});

test("PRIVACIDAD: lo que sale no lleva el nombre de nadie", () => {
  const r = mejoresListas([{ torneo: T("a", 50), clasificacion: [C(1, "dragapult")] }], "dragapult");
  const json = JSON.stringify(r);
  assert.ok(!json.includes("Nombre Real"));
  assert.ok(!json.includes("usuario"));
});

import { urlCartaLimitless } from "../src/lib/listasLimitless.ts";

test("imagen de carta: número con tres cifras, y null si falta algo", () => {
  assert.equal(urlCartaLimitless({ set: "twm", number: "5" }),
    "https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/TWM/TWM_005_R_EN_SM.png");
  assert.equal(urlCartaLimitless({ set: null, number: "5" }), null);
  assert.equal(urlCartaLimitless({ set: "TWM", number: "SV5a" }), null); // número raro: mejor sin imagen
});
