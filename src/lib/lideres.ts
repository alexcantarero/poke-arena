/* =========================================================================
   v0.58 — Los «líderes» de cada pestaña: dos Pokémon por sección, como los
   líderes de gimnasio. En el PC ancho salen en los márgenes vacíos; en el
   móvil, el primero asoma sobre la pestaña activa de la barra de abajo.

   Sin imports. Son slugs de los sprites de Limitless que ya usa la app para
   los mazos (`r2.limitlesstcg.net/pokemon/gen9/<slug>.png`): si alguno no
   existiera, el componente que lo pinta lo esconde, sin romper nada.
   ========================================================================= */

export type ParLideres = readonly [string, string];

const POR_SECCION: ReadonlyArray<[string, ParLideres]> = [
  ["/torneos", ["charizard", "lucario"]],
  ["/competiciones", ["machamp", "gengar"]],
  ["/estadisticas", ["alakazam", "metagross"]],
  ["/ranking", ["dragonite", "garchomp"]],
  ["/topdecks", ["dragapult", "gardevoir"]],
  ["/calendario", ["togekiss", "snorlax"]],
  ["/resultados", ["blastoise", "venusaur"]],
  ["/partidas", ["greninja", "zoroark"]],
  ["/perfil", ["mew", "mewtwo"]],
  ["/mazos", ["porygon2", "ditto"]],
  ["/ajustes", ["rotom", "magnezone"]],
  ["/reglas", ["slowking", "bronzong"]],
  ["/glosario", ["unown", "xatu"]],
];
const INICIO: ParLideres = ["pikachu", "eevee"];

/** Los líderes de una ruta: los de su sección, o los de Inicio. */
export function lideresDe(ruta: string): ParLideres {
  const r = ruta.split("?")[0];
  for (const [base, par] of POR_SECCION) if (r === base || r.startsWith(`${base}/`)) return par;
  return INICIO;
}
