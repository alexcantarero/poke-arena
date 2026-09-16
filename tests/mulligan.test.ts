import { test } from "node:test";
import assert from "node:assert/strict";
import {
  choose, probAtLeastOne, probExactly, mulliganChance, expectedMulligans,
  shuffle, expand, simulateHands, estimateBasics, looksBasic, deckSizeOf,
} from "../src/lib/mulligan.ts";
import type { Card, ParsedDeck } from "../src/lib/decklist.ts";

const c = (n: number, name: string): Card => ({ n, name, set: "TST", number: "1" });

const deck = (pokemon: Card[], trainer: Card[] = [], energy: Card[] = []): ParsedDeck => ({
  total: [...pokemon, ...trainer, ...energy].reduce((a, x) => a + x.n, 0),
  pokemon, trainer, energy, errors: [],
});

/* ------------------------------------------------------ combinatoria -- */

test("las combinaciones salen bien y no se van a infinito", () => {
  assert.equal(choose(5, 0), 1);
  assert.equal(choose(5, 5), 1);
  assert.equal(choose(5, 2), 10);
  assert.equal(choose(60, 7), 386206920);
  // El caso que rompe la implementación ingenua con factoriales: 60! es
  // Infinity en coma flotante, y esto tiene que seguir dando un número.
  assert.ok(Number.isFinite(choose(60, 30)));
  assert.equal(choose(3, 5), 0);
  assert.equal(choose(-1, 2), 0);
});

/* ---------------------------------------------------------- mulligan -- */

test("los extremos del mulligan son los que dicta el sentido común", () => {
  // Sin ningún básico, siempre mulligan. Con las 60 básicas, nunca.
  assert.equal(mulliganChance(0), 1);
  assert.equal(mulliganChance(60), 0);
  // Y con 54 o más es imposible fallar: solo hay 6 cartas que no son básicas
  // y la mano es de 7, así que alguna básica cae seguro.
  assert.equal(mulliganChance(54), 0);
});

test("el mulligan de un mazo normal cae donde debe", () => {
  /* Un mazo con 12 básicos falla algo más de una mano de cada cinco: 19,06%.
     El número sale de C(48,7)/C(60,7) y está comprobado a mano; si alguien
     toca la fórmula, esta prueba lo caza. */
  const p = mulliganChance(12);
  assert.ok(Math.abs(p - 0.1906) < 0.001, `esperaba ~0,1906 y ha salido ${p}`);

  // Y las cifras de referencia de los mazos que se juegan de verdad.
  assert.ok(Math.abs(mulliganChance(15) - 0.1175) < 0.001);
  assert.ok(Math.abs(mulliganChance(18) - 0.0699) < 0.001);

  // Menos básicos, más mulligan. Monótona, siempre.
  for (let b = 1; b < 20; b++) {
    assert.ok(mulliganChance(b) > mulliganChance(b + 1), `no baja entre ${b} y ${b + 1}`);
  }
});

test("mulligan y «al menos un básico» son complementarios", () => {
  for (const b of [1, 4, 8, 12, 15, 20]) {
    const suma = mulliganChance(b) + probAtLeastOne(b);
    assert.ok(Math.abs(suma - 1) < 1e-9, `con ${b} básicos la suma da ${suma}`);
  }
});

test("la media de mulligans seguidos sale de la geométrica", () => {
  // Con un 50% de fallar, se espera un mulligan por mano buena.
  assert.ok(Math.abs(expectedMulligans(0.5) - 1) < 1e-9);
  assert.equal(expectedMulligans(0), 0);
  assert.equal(expectedMulligans(1), Infinity);
});

/* ------------------------------------------------- abrir con la carta -- */

test("la probabilidad de abrir con una carta concreta", () => {
  assert.equal(probAtLeastOne(0), 0);
  assert.equal(probAtLeastOne(60), 1);
  // 4 copias en 60 cartas robando 7: en torno al 40%, que es el número que
  // todo el mundo repite y por eso se juegan 4 de lo importante.
  const p4 = probAtLeastOne(4);
  assert.ok(p4 > 0.39 && p4 < 0.41, `esperaba ~0,40 y ha salido ${p4}`);
  // Más copias, más probabilidad.
  assert.ok(probAtLeastOne(1) < probAtLeastOne(2));
  assert.ok(probAtLeastOne(2) < probAtLeastOne(3));
});

test("las probabilidades exactas de cada número de copias suman uno", () => {
  const copias = 4;
  let suma = 0;
  for (let k = 0; k <= copias; k++) suma += probExactly(copias, k);
  assert.ok(Math.abs(suma - 1) < 1e-9, `suman ${suma}`);
});

/* -------------------------------------------------------- barajar -- */

test("barajar no pierde ni inventa cartas", () => {
  const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const mezclado = shuffle(original);
  assert.equal(mezclado.length, original.length);
  assert.deepEqual([...mezclado].sort((a, b) => a - b), original);
  // Y no toca el array de entrada.
  assert.deepEqual(original, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("barajar reparte de forma uniforme", () => {
  /* La prueba que caza el `sort(() => Math.random() - 0.5)`: con tres cartas
     hay seis ordenaciones posibles y todas tienen que salir más o menos lo
     mismo. Con el atajo del sort, algunas salen el doble que otras. */
  const cuenta = new Map<string, number>();
  const vueltas = 6000;
  for (let i = 0; i < vueltas; i++) {
    const k = shuffle(["a", "b", "c"]).join("");
    cuenta.set(k, (cuenta.get(k) ?? 0) + 1);
  }
  assert.equal(cuenta.size, 6, "tienen que salir las seis ordenaciones");
  const esperado = vueltas / 6;
  for (const [orden, n] of cuenta) {
    assert.ok(
      Math.abs(n - esperado) < esperado * 0.25,
      `«${orden}» ha salido ${n} veces y se esperaban ~${esperado}`,
    );
  }
});

/* ------------------------------------------------------- simulación -- */

test("el montón tiene tantas cartas como dice la lista", () => {
  const d = deck([c(4, "Dreepy"), c(2, "Dragapult ex")], [c(4, "Ultra Ball")], [c(6, "Fire Energy")]);
  assert.equal(expand(d).length, 16);
  assert.equal(deckSizeOf(d), 16);
});

test("la simulación converge a la fórmula", () => {
  /* 20 básicos y 40 cartas más. Con muchas manos, la proporción observada
     tiene que acercarse a la exacta. La tolerancia es amplia a propósito: es
     azar de verdad y una prueba que falla una vez cada veinte no sirve. */
  const d = deck([c(20, "Básico")], [c(40, "Otra")]);
  const esBasico = (card: Card) => card.name === "Básico";
  const r = simulateHands(d, 4000, esBasico);

  assert.equal(r.hands, 4000);
  assert.ok(
    Math.abs(r.mulliganRate - r.exactRate) < 0.04,
    `observado ${r.mulliganRate} contra exacto ${r.exactRate}`,
  );
  assert.ok(r.lastHand.length === 7);
  // 20 de 60 son básicos, así que de media tocan ~2,33 por mano de 7.
  assert.ok(r.avgBasics > 2 && r.avgBasics < 2.7, `media de básicos: ${r.avgBasics}`);
});

test("un mazo sin básicos es siempre mulligan y uno todo básicos nunca", () => {
  const nada = deck([], [c(60, "Entrenador")]);
  assert.equal(simulateHands(nada, 50, () => false).mulliganRate, 1);

  const todo = deck([c(60, "Básico")]);
  assert.equal(simulateHands(todo, 50, () => true).mulliganRate, 0);
});

test("una carta cuenta una vez por mano aunque salgan dos copias", () => {
  // Mazo de 7 cartas: la mano es el mazo entero, así que cada carta aparece
  // en todas las manos, y solo una vez en cada una.
  const d = deck([c(4, "Dreepy")], [c(3, "Ultra Ball")]);
  const r = simulateHands(d, 10, () => true);
  assert.equal(r.appearances.get("Dreepy|TST|1"), 10);
  assert.equal(r.appearances.get("Ultra Ball|TST|1"), 10);
});

/* ------------------------------------------------ estimar los básicos -- */

test("las evoluciones conocidas no cuentan como básicos", () => {
  assert.equal(looksBasic(c(1, "Dreepy"), "pokemon"), true);
  assert.equal(looksBasic(c(1, "Drakloak"), "pokemon"), false);
  assert.equal(looksBasic(c(1, "Dragapult ex"), "pokemon"), false);
  assert.equal(looksBasic(c(1, "Grimmsnarl ex"), "pokemon"), false);
  // Los prefijos de personaje no despistan.
  assert.equal(looksBasic(c(1, "N's Zoroark ex"), "pokemon"), true);
  // Lo que no está en la sección de Pokémon nunca es básico.
  assert.equal(looksBasic(c(1, "Dreepy"), "trainer"), false);
  assert.equal(looksBasic(c(1, "Fire Energy"), "energy"), false);
});

test("el recuento estimado suma las copias, no las líneas", () => {
  const d = deck([c(4, "Dreepy"), c(3, "Drakloak"), c(3, "Dragapult ex"), c(2, "Fezandipiti ex")]);
  // Básicos estimados: los 4 Dreepy y los 2 Fezandipiti.
  assert.equal(estimateBasics(d), 6);
});
