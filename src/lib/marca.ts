/* v0.19 — Subtítulo de la cabecera sin la marca repetida.
   «Season 1 - PokeArena» debajo de «PokeArena TCG» repetía el nombre: se
   quita «PokeArena» (con o sin «TCG») y los separadores que queden colgando.
   Sin imports: lo cargan los tests. */
export function subtituloLiga(nombre: string, respaldo = ""): string {
  const limpio = nombre
    .replace(/poke\s*-?\s*arena(\s*tcg)?/gi, " ")
    .replace(/\s*[-–—·|:]\s*(?=[-–—·|:]|$)/g, "")
    .replace(/^\s*[-–—·|:]\s*/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return limpio || respaldo;
}
