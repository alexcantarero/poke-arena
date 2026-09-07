/* =========================================================================
   Importador de listas de mazo.

   Entiende los dos formatos que se usan en la práctica:

   1) Pokémon TCG Live / Limitless ("Copiar como texto")
        Pokémon: 14
        3 Dragapult ex TWM 130
        ...
        Trainer: 31
        4 Arven OBF 186
        ...
        Energy: 15
        9 Basic {P} Energy SVE 13
        Total Cards: 60

   2) El formato antiguo de PTCGO
        ****** Pokémon Trading Card Game Deck List ******
        ##Pokémon - 13
        * 1 Oranguru SUM 113
   ========================================================================= */

export type Card = { n: number; name: string; set: string; number: string };
export type SectionKey = "pokemon" | "trainer" | "energy";
export type ParsedDeck = {
  total: number;
  pokemon: Card[];
  trainer: Card[];
  energy: Card[];
  errors: string[];
};

const HEADER = /^(pok[eé]mon|trainer|entrenador|energy|energ[íi]a)\b\s*[:\-–]?\s*(\d+)?$/i;
const CARD = /^(\d+)\s+(.+?)(?:\s+([A-Z]{2,5}|PR-[A-Z]{2,4})\s+([0-9]{1,3}[a-zA-Z]?))?$/;

export function parseDeckList(text: string): ParsedDeck {
  const out: ParsedDeck = { total: 0, pokemon: [], trainer: [], energy: [], errors: [] };
  if (!text || !text.trim()) return out;

  let current: SectionKey = "pokemon";
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.trim();
    if (!line) continue;
    if (/^\*{3,}/.test(line)) continue;          // cabecera decorativa de PTCGO
    if (/^total\s*cards?/i.test(line)) continue; // "Total Cards: 60"
    line = line.replace(/^[*\-•]\s*/, "").replace(/^##\s*/, "");

    const h = line.match(HEADER);
    if (h) {
      current = /pok/i.test(h[1]) ? "pokemon" : /train|entren/i.test(h[1]) ? "trainer" : "energy";
      continue;
    }
    const c = line.match(CARD);
    if (!c) { out.errors.push(line); continue; }
    const card: Card = { n: parseInt(c[1], 10), name: c[2].trim(), set: c[3] ?? "", number: c[4] ?? "" };
    out[current].push(card);
    out.total += card.n;
  }
  return out;
}

const HEADLINER = /\b(ex|V|VMAX|VSTAR)\b/;
const isHeadliner = (name: string) => HEADLINER.test(name) || /^Mega\s/i.test(name);
const baseName = (name: string) =>
  name.replace(/\s*\b(ex|V|VMAX|VSTAR)\b\s*$/i, "").replace(/^Mega\s+/i, "").trim();
const sameLine = (a: string, b: string) => {
  const A = a.toLowerCase(), B = b.toLowerCase();
  return A === B || A.includes(B) || B.includes(A);
};

/**
 * Propone el Pokémon principal y el secundario a partir de la lista.
 *
 * El secundario solo se busca entre cartas "protagonistas" (ex, V, VMAX,
 * VSTAR, Mega): así una línea evolutiva completa —Dreepy, Drakloak,
 * Dragapult ex— no acaba proponiendo "Dreepy" como segundo Pokémon del
 * arquetipo.
 */
export function suggestArchetype(parsed: ParsedDeck): { main: string; secondary: string } {
  if (!parsed.pokemon.length) return { main: "", secondary: "" };
  const score = (c: Card) => {
    let s = c.n;
    if (/\bex\b/i.test(c.name)) s += 6;
    if (/\bV(MAX|STAR)?\b/.test(c.name)) s += 5;
    if (/^Mega\s/i.test(c.name)) s += 6;
    return s;
  };
  const ranked = [...parsed.pokemon].sort((a, b) => score(b) - score(a));
  const main = baseName(ranked[0].name);
  let secondary = "";
  for (const c of ranked) {
    if (!isHeadliner(c.name)) continue;
    const b = baseName(c.name);
    if (b && b !== main && !sameLine(b, main)) { secondary = b; break; }
  }
  return { main, secondary };
}

/** Comprobaciones básicas de legalidad (Standard). */
export function validateDeck(parsed: ParsedDeck) {
  const problems: string[] = [];
  if (parsed.total !== 60) problems.push(`La lista suma ${parsed.total} cartas, no 60.`);
  const counts = new Map<string, number>();
  for (const c of [...parsed.pokemon, ...parsed.trainer]) {
    counts.set(c.name, (counts.get(c.name) ?? 0) + c.n);
  }
  for (const [name, n] of counts) {
    if (n > 4 && !/\bEnergy\b/i.test(name)) problems.push(`${n} copias de ${name} (el máximo son 4).`);
  }
  if (parsed.errors.length) problems.push(`${parsed.errors.length} líneas no se han entendido.`);
  return problems;
}
