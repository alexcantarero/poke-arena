/* =========================================================================
   Series online que se siguen SIEMPRE, aunque no lleguen al mínimo de
   jugadores ni sean estrictamente semanales.

   v0.45. La detección automática (`lib/seriesOnline.ts`) solo pone en el
   calendario lo que se repite con regularidad y pasa de 100 jugadores de
   media. Las de aquí entran con solo dos ediciones recientes y sin mínimo.

   Para añadir una, una línea más. El patrón se compara contra el nombre
   del torneo SIN mayúsculas, sin acentos, sin espacios y sin símbolos, así
   que «🏆 Moujii's Dojo 🏆», «Mouji's Dojo» y «MOUJI DOJO» encajan todos con
   «mouji». Elige un trozo corto y que no lleve otra serie dentro.
   ========================================================================= */

export const SERIES_SEGUIDAS: ReadonlyArray<{ patron: string; nombre: string }> = [
  { patron: "crownofspain", nombre: "Crown of Spain" },
  { patron: "mouji", nombre: "Mouji's Dojo" },
];
