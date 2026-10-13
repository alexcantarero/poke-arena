import { test } from "node:test";
import assert from "node:assert/strict";
import { consultaLimpia, lineaDeLista, setIdDeCarta, urlDeImagen } from "../src/lib/cartas.ts";

/* El fichero bajo prueba es el que decide si la línea que copias se puede
   pegar en Pokémon TCG Live o no. Los casos de abajo son ids reales de
   TCGdex, elegidos porque cada uno rompe una forma distinta de partir la
   cadena. */

test("setIdDeCarta: el caso normal", () => {
  assert.equal(setIdDeCarta("sv08-26", "26"), "sv08");
  assert.equal(setIdDeCarta("base4-1", "1"), "base4");
});

test("setIdDeCarta: el set lleva un punto, y el localId letras", () => {
  // Partir por el primer guion daría "sv03.5" bien, pero el localId no.
  assert.equal(setIdDeCarta("sv03.5-12", "12"), "sv03.5");
  // Partir por el ÚLTIMO guion fallaría si el localId llevara guion.
  assert.equal(setIdDeCarta("xyp-XY99", "XY99"), "xyp");
  assert.equal(setIdDeCarta("swshp-SWSH284", "SWSH284"), "swshp");
});

test("setIdDeCarta: sin localId no se inventa nada", () => {
  // Si la respuesta viniera sin localId, recortar por la cola no aplica y se
  // devuelve el id entero: feo, pero no miente sobre cuál es el set.
  assert.equal(setIdDeCarta("sv08-26", ""), "sv08-26");
  assert.equal(setIdDeCarta("sv08-26", "99"), "sv08-26");
});

test("urlDeImagen: TCGdex sirve la base sin extensión", () => {
  const base = "https://assets.tcgdex.net/en/swsh/swsh3/136";
  assert.equal(urlDeImagen(base), `${base}/low.png`);
  assert.equal(urlDeImagen(base, "high", "webp"), `${base}/high.webp`);
});

test("urlDeImagen: una carta sin imagen subida devuelve null, no una URL rota", () => {
  assert.equal(urlDeImagen(undefined), null);
  assert.equal(urlDeImagen(null), null);
  assert.equal(urlDeImagen("   "), null);
});

test("lineaDeLista: el formato que acepta Pokémon TCG Live", () => {
  const c = { name: "Dragapult ex", setCode: "TWM", number: "130" };
  assert.equal(lineaDeLista(c), "1 Dragapult ex TWM 130");
  assert.equal(lineaDeLista(c, 4), "4 Dragapult ex TWM 130");
});

test("lineaDeLista: sin set o sin número se queda en el nombre", () => {
  // Media línea no la importa TCG Live; es mejor que se note que falta algo.
  assert.equal(lineaDeLista({ name: "Iono", setCode: "", number: "185" }), "1 Iono");
  assert.equal(lineaDeLista({ name: "Iono", setCode: "PAL", number: "" }), "1 Iono");
});

test("consultaLimpia: quita los dos puntos porque TCGdex los usa de operador", () => {
  // Sin esto, escribir "eq:pikachu" cambiaría el filtro de «contiene» a
  // «es igual a», y el buscador dejaría de encontrar nada sin explicar nada.
  assert.equal(consultaLimpia("eq:pikachu"), "eq pikachu");
  assert.equal(consultaLimpia("not:dragapult"), "not dragapult");
});

test("consultaLimpia: espacios y largos", () => {
  assert.equal(consultaLimpia("  dragapult   ex  "), "dragapult ex");
  assert.equal(consultaLimpia("a".repeat(200)).length, 60);
  assert.equal(consultaLimpia("   "), "");
});
