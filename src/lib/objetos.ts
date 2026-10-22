/* =========================================================================
   v0.63 — Los objetos de Pokémon que decoran Registrar partida.

   Sin imports, como el resto de módulos que se prueban.

   Misma regla que `balls.ts`: los sprites NO se dibujan, se enlazan los del
   repositorio oficial de sprites de PokéAPI (carpeta `items`), que los aloja
   precisamente para que se usen. Cada objeto está elegido por lo que
   significa en el juego, no al azar:

     · Buscarrivales  → «¿Contra quién?» (sirve para volver a retar a otro).
     · Moneda Amuleto → Premios (en los juegos duplica el dinero del premio).
     · Caramelo Raro  → Resultado (subir de nivel).
     · Poké Ball      → Guardar (capturarlo).
     · Mapa           → Contexto de la partida (dónde y cuándo).
   ========================================================================= */

export const OBJETOS = {
  rival: "vs-seeker",
  premios: "amulet-coin",
  resultado: "rare-candy",
  guardar: "poke-ball",
  contexto: "town-map",
} as const;

export type UsoObjeto = keyof typeof OBJETOS;

/** URL del sprite de un objeto. Acepta un uso («premios») o un slug de PokéAPI. */
export function urlDeObjeto(usoOSlug: UsoObjeto | string): string {
  const slug = (OBJETOS as Record<string, string>)[usoOSlug] ?? usoOSlug;
  const limpio = slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${limpio}.png`;
}
