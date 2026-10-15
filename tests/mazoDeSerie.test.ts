import { test } from "node:test";
import assert from "node:assert/strict";
import { arquetipoPorJuegos, archetypesOfMatch } from "../src/lib/stats.ts";
import type { Archetype, MatchFull } from "../src/lib/types.ts";

const arch = (id: string): Archetype => ({ id, name: id, main: id, secondary: "", type: "colorless", limitlessId: null, parentId: null } as Archetype);
const archById = new Map(["dragapult", "gardevoir", "zoroark"].map((id) => [id, arch(id)]));
const g = (number: number, a: string | null, b: string | null) =>
  ({ number, archetypeAId: a, archetypeBId: b });

/* ------------------------------------------------- arquetipoPorJuegos ---- */

test("el más repetido en los juegos", () => {
  assert.equal(arquetipoPorJuegos([g(1, "dragapult", null), g(2, "dragapult", null), g(3, "gardevoir", null)], "a"), "dragapult");
});

test("a igualdad, el del juego más temprano", () => {
  // 1-1 con dos mazos: el del juego 1 es con el que empezó la serie.
  assert.equal(arquetipoPorJuegos([g(2, "gardevoir", null), g(1, "dragapult", null)], "a"), "dragapult");
});

test("ningún juego lo apuntó: null, nunca inventado", () => {
  assert.equal(arquetipoPorJuegos([g(1, null, null), g(2, null, null)], "a"), null);
  assert.equal(arquetipoPorJuegos([], "a"), null);
});

test("cada lado por separado", () => {
  const juegos = [g(1, "dragapult", "zoroark"), g(2, "dragapult", "zoroark")];
  assert.equal(arquetipoPorJuegos(juegos, "a"), "dragapult");
  assert.equal(arquetipoPorJuegos(juegos, "b"), "zoroark");
});

/* ------------------------------------------- EL FALLO QUE ESTO CORRIGE ---- */

const partida = (over: Partial<MatchFull>): MatchFull => ({
  deckAId: null, archetypeAId: null, deckBId: null, opponentArchetypeId: null,
  games: [], ...over,
} as MatchFull);

test("EL FALLO QUE ESTO CORRIGE: serie sin mazo, juegos con mazo → ya cuenta", () => {
  // Así quedó guardada toda partida registrada desde el 9 de octubre: el
  // formulario dejó de pintar el selector de la serie. Sin el respaldo, esta
  // partida no tenía arquetipo para ninguna estadística salvo la matriz.
  const m = partida({ games: [g(1, "dragapult", "zoroark"), g(2, "dragapult", "zoroark")] as never });
  const { a, b } = archetypesOfMatch(m, new Map(), archById);
  assert.equal(a?.id, "dragapult");
  assert.equal(b?.id, "zoroark");
});

test("el mazo de la serie sigue mandando sobre el de los juegos", () => {
  const m = partida({
    archetypeAId: "gardevoir",
    games: [g(1, "dragapult", null), g(2, "dragapult", null)] as never,
  });
  assert.equal(archetypesOfMatch(m, new Map(), archById).a?.id, "gardevoir");
});

test("sin nada en ningún sitio, sigue sin arquetipo", () => {
  const m = partida({ games: [g(1, null, null)] as never });
  const { a, b } = archetypesOfMatch(m, new Map(), archById);
  assert.equal(a, undefined);
  assert.equal(b, undefined);
});
