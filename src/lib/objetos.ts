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

/* =========================================================================
   v0.64 — Sprites para decorar la web en vez de emojis.

   Una referencia es `objeto:<slug de PokéAPI>` o `pokemon:<nombre>`. Los
   objetos salen de PokéAPI (como las Balls); los Pokémon, de donde ya salen
   todos los de la app (Limitless). Edificios y estructuras (el Centro
   Pokémon, los gimnasios) NO están publicados como sprites, y dibujarlos
   sería copiar un diseño de Pokémon: por eso el Inicio lleva a Chansey, la
   ayudante del Centro Pokémon, en vez del edificio.
   ========================================================================= */

export type RefSprite = { tipo: "objeto" | "pokemon"; slug: string };

export function leerRef(ref: string): RefSprite | null {
  const m = /^(objeto|pokemon):([a-z0-9-]+)$/.exec(ref.trim().toLowerCase());
  return m ? { tipo: m[1] as RefSprite["tipo"], slug: m[2] } : null;
}

/** La Ball de cada familia de torneo: cuanto más grande el torneo, mejor la Ball. */
export const BALL_DE_FAMILIA: Record<string, string> = {
  challenge: "poke-ball", cup: "great-ball", major: "ultra-ball", online: "premier-ball", otro: "poke-ball",
};
