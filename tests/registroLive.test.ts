import { test } from "node:test";
import assert from "node:assert/strict";
import { adivinarArquetipo, leerRegistros, quienSoy } from "../src/lib/registroLive.ts";
import { pokeSlug } from "../src/lib/pokemon.ts";

const partida = (yo: string, rival: string, gana: string, extra = "") => `Setup
${yo} chose heads for the opening coin flip.
${rival} won the coin toss.
${rival} decided to go first.
${yo} drew 7 cards for the opening hand.
- 7 drawn cards.
${rival} drew 7 cards for the opening hand.
${yo} played Dreepy to the Active Spot.
${rival} played (sv8_59) Slowpoke to the Active Spot.
Turn # 1 - ${rival}'s Turn
${rival} drew Kyurem and played it to the Bench.
${rival}'s Slowpoke evolved into Slowking on the Bench.
${extra}
Opponent conceded. ${gana} wins.`;

test("una partida: jugadores, ganador, quién empezó y los Pokémon de cada uno", () => {
  const [p] = leerRegistros(partida("IbaiM", "Rival_7", "IbaiM"));
  assert.deepEqual(p.jugadores, ["IbaiM", "Rival_7"]);
  assert.equal(p.ganador, "IbaiM");
  assert.equal(p.primero, "Rival_7");
  assert.deepEqual(p.pokemon["Rival_7"], ["Slowpoke", "Kyurem", "Slowking"]);
  assert.deepEqual(p.pokemon["IbaiM"], ["Dreepy"]);
});

test("varias partidas pegadas seguidas; y quién soy: el que sale en todas", () => {
  const ps = leerRegistros(`${partida("IbaiM", "A", "A")}\n${partida("IbaiM", "B", "IbaiM")}`);
  assert.equal(ps.length, 2);
  assert.equal(quienSoy(ps), "IbaiM");
  assert.equal(quienSoy([ps[0]]), null); // con una sola, no se sabe: hay que decirlo
  assert.equal(quienSoy([ps[0]], "IbaiM"), "IbaiM");
  assert.deepEqual(leerRegistros("texto que no es un registro"), []);
});

test("el arquetipo del rival: su principal tiene que verse; el secundario desempata", () => {
  const cat = [
    { id: "a1", name: "Slowking", main: "slowking", secondary: null },
    { id: "a2", name: "Slowking / Kyurem", main: "slowking", secondary: "kyurem" },
    { id: "a3", name: "Dragapult", main: "dragapult", secondary: null },
  ];
  assert.equal(adivinarArquetipo(["Slowpoke", "Kyurem", "Slowking"], cat, pokeSlug)?.id, "a2");
  assert.equal(adivinarArquetipo(["Slowpoke", "Slowking"], cat, pokeSlug)?.id, "a1");
  assert.equal(adivinarArquetipo(["Pikachu"], cat, pokeSlug), null);
});
