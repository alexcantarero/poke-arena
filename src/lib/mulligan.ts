/* =========================================================================
   Manos iniciales: mulligan y probabilidades de apertura.

   Las reglas que hay detrás, porque sin ellas los números no significan nada:

   · Se roban **7 cartas**. Si en esa mano no hay ningún Pokémon **Básico**,
     es mulligan: la enseñas, barajas y vuelves a robar 7, y el rival roba una
     carta extra.
   · Por tanto la probabilidad de mulligan depende **solo** de cuántos básicos
     lleva el mazo. Y tiene fórmula exacta, no hace falta simular:

         P(mulligan) = C(60 - B, 7) / C(60, 7)

     que es «de cuántas maneras puedo robar 7 cartas sin tocar ningún básico»
     entre «de cuántas maneras puedo robar 7 cartas».

   Aquí conviven las dos cosas a propósito:

   · **La fórmula** contesta exacto y al instante «¿cuántas veces me quedo sin
     básico?» y «¿cuántas veces abro con esta carta?». Simular eso sería
     cambiar una respuesta exacta por una aproximada.
   · **La simulación** sirve para lo que la fórmula no cuenta: ver manos de
     verdad, una detrás de otra, y hacerse una idea de cómo abre el mazo.

   EL PROBLEMA HONESTO
   -------------------
   Una lista pegada **no dice qué Pokémon son Básicos**. "4 Dreepy TWM 128" no
   lleva escrito en ningún sitio que Dreepy sea básico y Drakloak no. Así que
   se estima con una heurística —los nombres de evoluciones conocidas y los
   sufijos que delatan una etapa— y la interfaz deja corregir el número a
   mano. Quien juega el mazo lo sabe; este fichero, no. Fingir lo contrario
   daría un porcentaje con pinta de exacto y equivocado.
   ========================================================================= */

import type { Card, ParsedDeck } from "./decklist";

export const HAND_SIZE = 7;
export const DECK_SIZE = 60;

/* ------------------------------------------------------- combinatoria -- */

/**
 * C(n, k) — combinaciones sin repetición.
 *
 * Multiplicando y dividiendo en el mismo bucle, no con factoriales: 60! no
 * cabe en un `number` y daría Infinity, mientras que así los valores
 * intermedios se quedan pequeños y el resultado es exacto.
 */
export function choose(n: number, k: number): number {
  if (k < 0 || n < 0 || k > n) return 0;
  const m = Math.min(k, n - k);
  let out = 1;
  for (let i = 1; i <= m; i++) out = (out * (n - m + i)) / i;
  return out;
}

/**
 * Probabilidad de robar **al menos una** copia de algo.
 *
 * Es la pregunta que se hace todo el mundo: «¿cuántas veces abro con
 * Profesor?». Se calcula por el complementario —uno menos la probabilidad de
 * no robar ninguna—, que es una sola combinatoria en vez de una suma.
 */
export function probAtLeastOne(copies: number, deckSize = DECK_SIZE, draws = HAND_SIZE): number {
  if (copies <= 0 || draws <= 0) return 0;
  if (copies >= deckSize) return 1;
  if (draws >= deckSize) return 1;
  return 1 - choose(deckSize - copies, draws) / choose(deckSize, draws);
}

/** Probabilidad de robar exactamente `k` copias. */
export function probExactly(
  copies: number, k: number, deckSize = DECK_SIZE, draws = HAND_SIZE,
): number {
  const total = choose(deckSize, draws);
  if (!total) return 0;
  return (choose(copies, k) * choose(deckSize - copies, draws - k)) / total;
}

/**
 * Probabilidad de mulligan: la mano sale sin ningún básico.
 * Es el complementario de `probAtLeastOne(basics)`.
 */
export function mulliganChance(basics: number, deckSize = DECK_SIZE, hand = HAND_SIZE): number {
  if (basics <= 0) return 1;
  if (basics >= deckSize) return 0;
  return choose(deckSize - basics, hand) / choose(deckSize, hand);
}

/**
 * Cuántos mulligans seguidos cabe esperar antes de abrir.
 *
 * Es una geométrica: con p de fallar, la media de intentos hasta acertar es
 * 1/(1-p). Sirve para traducir un 12% a «uno de cada ocho manos».
 */
export function expectedMulligans(p: number): number {
  if (p >= 1) return Infinity;
  return p / (1 - p);
}

/* --------------------------------------------------------- simulación -- */

/** Una carta repetida tantas veces como copias lleve: el mazo como montón. */
export function expand(deck: ParsedDeck): Card[] {
  const out: Card[] = [];
  for (const section of [deck.pokemon, deck.trainer, deck.energy]) {
    for (const c of section) {
      for (let i = 0; i < c.n; i++) out.push(c);
    }
  }
  return out;
}

/**
 * Barajar de verdad: Fisher-Yates.
 *
 * NO se usa `sort(() => Math.random() - 0.5)`, que es el atajo de siempre y
 * está mal: el comparador es incoherente —no cumple lo que un `sort` espera—
 * y el resultado no reparte todas las ordenaciones por igual; algunas salen
 * varias veces más que otras. Aquí lo que se está midiendo es precisamente el
 * azar, así que un barajado sesgado no sesgaría la estética: sesgaría la
 * respuesta.
 */
export function shuffle<T>(cards: T[], rand: () => number = Math.random): T[] {
  const a = [...cards];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Una clave estable para contar apariciones de una carta concreta. */
export const cardKey = (c: Card) => `${c.name}|${c.set ?? ""}|${c.number ?? ""}`;

export type SimResult = {
  hands: number;
  mulligans: number;
  /** Proporción observada de manos sin básico. */
  mulliganRate: number;
  /** La exacta, para poder comparar y ver si la muestra es suficiente. */
  exactRate: number;
  /** Básicos por mano, de media. */
  avgBasics: number;
  /** Cuántas veces ha aparecido cada carta en la mano inicial. */
  appearances: Map<string, number>;
  /** La última mano robada, para poder enseñarla. */
  lastHand: Card[];
};

/**
 * Roba N manos y cuenta.
 *
 * `isBasic` viene de fuera a propósito: la lista no dice qué es básico (ver
 * la cabecera) y quien llama puede haberlo corregido a mano.
 */
export function simulateHands(
  deck: ParsedDeck,
  n: number,
  isBasic: (c: Card) => boolean,
  rand: () => number = Math.random,
): SimResult {
  const pile = expand(deck);
  const size = pile.length || DECK_SIZE;
  const hands = Math.max(1, Math.min(50000, Math.floor(n)));

  let mulligans = 0;
  let basicsTotal = 0;
  const appearances = new Map<string, number>();
  let lastHand: Card[] = [];

  for (let i = 0; i < hands; i++) {
    const hand = shuffle(pile, rand).slice(0, HAND_SIZE);
    lastHand = hand;

    let basics = 0;
    const vistas = new Set<string>();
    for (const c of hand) {
      if (isBasic(c)) basics++;
      const k = cardKey(c);
      // Una carta cuenta una vez por mano aunque salgan dos copias: la
      // pregunta es «¿cuántas veces la veo?», no «¿cuántas copias veo?».
      if (!vistas.has(k)) {
        vistas.add(k);
        appearances.set(k, (appearances.get(k) ?? 0) + 1);
      }
    }
    basicsTotal += basics;
    if (basics === 0) mulligans++;
  }

  const basicCount = pile.filter(isBasic).length;
  return {
    hands,
    mulligans,
    mulliganRate: mulligans / hands,
    exactRate: mulliganChance(basicCount, size),
    avgBasics: basicsTotal / hands,
    appearances,
    lastHand,
  };
}

/* ------------------------------------------------- ¿qué es un básico? -- */

/**
 * Nombres que delatan una evolución.
 *
 * Es una heurística, no una base de datos: cubre lo que se ve en el Standard
 * de hoy y se queda corta con lo que salga mañana. Por eso el número final es
 * editable en pantalla. La lista está en minúsculas y sin acentos.
 */
const EVOLUTIONS = new Set([
  "drakloak", "dragapult", "charmeleon", "charizard", "ivysaur", "venusaur",
  "wartortle", "blastoise", "metang", "metagross", "kirlia", "gardevoir", "gallade",
  "thwackey", "rillaboom", "raboot", "cinderace", "drizzile", "inteleon",
  "dartrix", "decidueye", "torracat", "incineroar", "brionne", "primarina",
  "quilladin", "chesnaught", "braixen", "delphox", "frogadier", "greninja",
  "grovyle", "sceptile", "combusken", "blaziken", "marshtomp", "swampert",
  "bakugan", "dipplin", "hydrapple", "banette", "dusclops", "dusknoir",
  "sandaconda", "arboliva", "lokix", "grimmsnarl", "morgrem", "froslass",
  "kadabra", "alakazam", "haunter", "gengar", "graveler", "golem",
  "magmortar", "electivire", "rhydon", "rhyperior", "porygon2", "porygon-z",
  "dusk", "vikavolt", "charjabug", "lycanroc", "toxtricity", "kommo-o", "hakamo-o",
  "flapple", "appletun", "drednaw", "coalossal", "carkol", "corviknight", "corvisquire",
  "pupitar", "tyranitar", "shelgon", "salamence", "vibrava", "flygon",
  "crustle", "excadrill", "boldore", "gigalith", "conkeldurr", "gurdurr",
]);

/** Sufijos y palabras que casi siempre indican que NO es un Pokémon. */
const NOT_POKEMON = /\b(energy|energía|ball|research|professor|boss|order|switch|rod|stadium|belt|vitality|candy|catcher|bell|stretcher|capsule|cape|board|hammer|turbo|scoop|trolley|mask)\b/i;

/**
 * ¿Parece un Pokémon Básico?
 *
 * Solo mira la sección de Pokémon de la lista, descarta lo que suena a
 * entrenador o energía colado ahí, y quita los nombres que están en la tabla
 * de evoluciones. Todo lo demás se da por básico, que es lo más frecuente.
 */
export function looksBasic(card: Card, section: "pokemon" | "trainer" | "energy"): boolean {
  if (section !== "pokemon") return false;
  const name = (card.name || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (!name) return false;
  if (NOT_POKEMON.test(name)) return false;

  // "N's Zoroark ex" → "zoroark ex"; se compara la primera palabra útil.
  const limpio = name
    .replace(/^(?:team\s+)?[a-z'’.]+(?:'s|’s)\s+/i, "")
    .replace(/\b(ex|v|vmax|vstar|gx)\b/g, "")
    .trim();
  const base = limpio.split(/[\s-]+/)[0] ?? "";
  return !EVOLUTIONS.has(base) && !EVOLUTIONS.has(limpio);
}

/** Cuenta los básicos estimados de una lista. */
export function estimateBasics(deck: ParsedDeck): number {
  let n = 0;
  for (const c of deck.pokemon) {
    if (looksBasic(c, "pokemon")) n += c.n;
  }
  return n;
}

/** Cuántas cartas tiene la lista de verdad. Una lista a medias no son 60. */
export const deckSizeOf = (deck: ParsedDeck): number =>
  [deck.pokemon, deck.trainer, deck.energy].reduce(
    (a, sec) => a + sec.reduce((b, c) => b + c.n, 0), 0,
  );
