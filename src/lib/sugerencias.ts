/* =========================================================================
   Cuántas rondas y qué corte le tocan a un torneo, según su tamaño y tipo.

   Sin imports, como el resto de módulos que se prueban.

   v0.47 — antes vivían en `lib/stats.ts`. Los formularios de torneo y de liga
   son componentes de cliente y las importaban de ahí, y eso se llevaba al
   navegador las 1.284 líneas de `stats.ts` para usar dos funciones. Aquí son
   unas pocas decenas.
   ========================================================================= */

/** Tipos de torneo por familia. El Día 2 solo existe en `TWO_PHASE_KINDS`. */
export const TWO_PHASE_KINDS = new Set(["regional", "special", "international", "worlds"]);
export const CUP_KINDS = new Set(["league_cup", "pokemon_cup"]);
export const CHALLENGE_KINDS = new Set(["league_challenge", "pokemon_challenge"]);

/**
 * Rondas recomendadas para un suizo según el número de participantes y tipo de torneo,
 * según el Play! Pokémon Tournament Rules Handbook (Edición 1 de septiembre de 2026).
 *
 * - Para torneos de dos fases / Regionales (Variant #5):
 *   65–128: 9 rondas (7 Día 1 + 2 Día 2)
 *   129–256: 10 rondas (8 Día 1 + 2 Día 2)
 *   257–512: 11 rondas (8 Día 1 + 3 Día 2)
 *   513–1024: 12 rondas (8 Día 1 + 4 Día 2)
 *   1025–2048: 13 rondas (8 Día 1 + 5 Día 2)
 *   2049–4096: 14 rondas (8 Día 1 + 6 Día 2)
 *   4097–8192: 15 rondas (9 Día 1 + 6 Día 2)
 *
 * - Para League Cups (Variant #3: TCG Single Day):
 *   4–8: 3, 9–12: 4, 13–32: 5, 33–64: 6, 65–128: 7, 129–226: 8, 227–409: 9, 410+: 10
 *
 * - Para League Challenges (Variant #2: TCG Swiss Only):
 *   4–8: 3, 9–16: 4, 17–32: 5, 33–64: 6, 65–128: 7, 129–256: 8, 257–512: 9, 513+: 10
 */
export function suggestedRounds(n: number, kind?: string): number {
  if (n <= 2) return 1;

  const isRegional = kind ? TWO_PHASE_KINDS.has(kind) : n >= 65;

  if (isRegional) {
    if (n <= 8) return 3;
    if (n <= 16) return 4;
    if (n <= 32) return 6;
    if (n <= 64) return 7;
    if (n <= 128) return 9;
    if (n <= 256) return 10;
    if (n <= 512) return 11;
    if (n <= 1024) return 12;
    if (n <= 2048) return 13;
    if (n <= 4096) return 14;
    return 15;
  }

  if (kind && CUP_KINDS.has(kind)) {
    if (n <= 8) return 3;
    if (n <= 12) return 4;
    if (n <= 32) return 5;
    if (n <= 64) return 6;
    if (n <= 128) return 7;
    if (n <= 226) return 8;
    if (n <= 409) return 9;
    return 10;
  }

  if (kind && CHALLENGE_KINDS.has(kind)) {
    if (n <= 8) return 3;
    if (n <= 16) return 4;
    if (n <= 32) return 5;
    if (n <= 64) return 6;
    if (n <= 128) return 7;
    if (n <= 256) return 8;
    if (n <= 512) return 9;
    return 10;
  }

  return Math.max(1, Math.ceil(Math.log2(n)));
}

/** Top cut recomendado según la asistencia y tipo de evento. */
export function suggestedTopCut(n: number, kind?: string): number {
  // League Challenge: suizo y se acabó (§5.5.6.1, Variante #2). Va lo primero
  // para que ningún tamaño de torneo le invente un corte.
  if (kind && CHALLENGE_KINDS.has(kind)) return 0;
  if (n < 8) return 0;
  const isRegional = kind ? TWO_PHASE_KINDS.has(kind) : n >= 65;
  if (isRegional) return 8;
  // League Cup (Variante #3): 4–8 sin corte, 9–20 top 4, 21+ top 8.
  if (kind && CUP_KINDS.has(kind)) return n <= 8 ? 0 : n <= 20 ? 4 : 8;
  if (n <= 20) return 4;
  return 8;
}
