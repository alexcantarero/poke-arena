/* =========================================================================
   Las Balls de la pantalla de carga.

   Sin imports, como el resto de módulos que se prueban.

   Los sprites NO se dibujan: son los de objetos del repositorio oficial de
   sprites de PokéAPI (github.com/PokeAPI/sprites, carpeta `items`), que los
   aloja ahí precisamente para que se usen. Es la misma regla que se fijó en
   la v0.11 con los Pokémon: dibujar la Poké Ball sería copiar un diseño de
   Pokémon; enlazar el sprite publicado, no.
   ========================================================================= */

/** Slugs de PokéAPI. Las de siempre primero; luego unas cuantas más raras. */
export const BALLS = [
  "poke-ball", "great-ball", "ultra-ball", "master-ball", "premier-ball",
  "luxury-ball", "dusk-ball", "quick-ball", "heal-ball", "timer-ball",
] as const;

export type Ball = (typeof BALLS)[number];

export const urlDeBall = (b: Ball) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${b}.png`;

/**
 * Una Ball al azar, con más peso para las tres de siempre.
 *
 * La Poké Ball, la Super Ball y la Ultra Ball salen la mitad de las veces;
 * el resto se reparte. Una Master Ball de vez en cuando hace gracia; una en
 * cada carga, no.
 *
 * `azar` entra por parámetro para poder probarla sin depender de la suerte.
 */
export function ballAlAzar(azar: number = Math.random()): Ball {
  const r = Math.min(0.999999, Math.max(0, azar));
  if (r < 0.5) return BALLS[Math.floor((r / 0.5) * 3)];
  const raras = BALLS.slice(3);
  return raras[Math.floor(((r - 0.5) / 0.5) * raras.length)];
}
