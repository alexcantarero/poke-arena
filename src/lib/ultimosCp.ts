/* =========================================================================
   Los últimos resultados que dieron Championship Points.

   Sin imports, como el resto de módulos que se prueban: los CP ya
   calculados entran por parámetro, porque quien sabe calcularlos es
   `lib/cp.ts` y aquí no se vuelve a hacer esa cuenta. Dos sitios calculando
   CP es exactamente el fallo de la v0.9.0, donde unas pantallas leían la
   columna en crudo y otras recalculaban.

   Qué sustituye y por qué
   -----------------------
   La pestaña del Elo de la portada era una gráfica de trece líneas de
   colores en la que no se distingue una de otra ni en un monitor grande, y
   que además contesta una pregunta que el ranking ya contesta mejor. Lo
   que de verdad se quiere saber de un vistazo es qué ha pasado últimamente
   en el circuito: quién fue a qué, cuándo y cuántos puntos se llevó.
   ========================================================================= */

export type ResultadoConCp = {
  /** Id del resultado, para la clave de React. */
  id: string;
  torneoId: string;
  torneo: string;
  /** ISO corta, `2026-10-11`. */
  fecha: string;
  /** El tipo ya traducido («Regional», «League Cup»…). */
  tipo: string;
  jugadorId: string;
  jugador: string;
  puesto: number | null;
  /** CP efectivos, ya calculados por quien llama. */
  cp: number;
  /** v0.82 — tipo (para el color) y clase de medalla de CP. */
  kind?: string;
  clase?: string;
};

/** Lo mínimo que hace falta de cada resultado para ordenarlo. */
export type EntradaCp = {
  id: string;
  torneoId: string;
  torneo: string;
  fecha: string;
  tipo: string;
  jugadorId: string;
  jugador: string;
  puesto: number | null;
  cp: number;
  /** v0.82 — el tipo de torneo (para su color, el del calendario) y la clase de
      medalla de CP (`cp-rank-*`, la misma gama que en el perfil). */
  kind?: string;
  clase?: string;
};

/**
 * Los N últimos resultados que puntuaron, del más reciente al más antiguo.
 *
 * **Solo entran los que puntuaron de verdad** (`cp > 0`). Un resultado a
 * cero no es «un torneo sancionado al que fuiste»: puede ser un torneo que
 * no da CP, un puesto que no llega al tramo o una asistencia sin rellenar,
 * y las tres cosas se leerían aquí como «fue y no sacó nada», que es
 * engañoso. Quien quiera verlos tiene la ficha del torneo, que además
 * explica por qué el cero (`explainCp`).
 *
 * El desempate a igual fecha es por CP descendente: si en el mismo fin de
 * semana dos personas puntuaron, arriba la que más sacó. Y después por id,
 * para que el orden sea estable entre recargas y no baile.
 */
export function ultimosConCp(entradas: EntradaCp[], cuantos = 5): ResultadoConCp[] {
  return entradas
    .filter((e) => e.cp > 0)
    .slice()
    .sort((a, b) =>
      b.fecha.localeCompare(a.fecha) || b.cp - a.cp || a.id.localeCompare(b.id))
    .slice(0, Math.max(0, cuantos));
}

/**
 * Los N resultados que MÁS CP dieron, del mayor al menor.
 *
 * v0.41 — la otra mitad de la pregunta. «Los más recientes» dice qué está
 * pasando; «los mayores» dice cuáles fueron los grandes resultados de la
 * temporada. Las dos solo con resultados que puntuaron, por la misma razón
 * que `ultimosConCp`: un cero no es un resultado, es la ausencia de uno.
 *
 * A igual CP, el más reciente arriba: entre dos +50, el de esta semana pesa
 * más que el de hace cuatro meses. Y después por id, para que no baile.
 */
export function mayoresConCp(entradas: EntradaCp[], cuantos = 5): ResultadoConCp[] {
  return entradas
    .filter((e) => e.cp > 0)
    .slice()
    .sort((a, b) =>
      b.cp - a.cp || b.fecha.localeCompare(a.fecha) || a.id.localeCompare(b.id))
    .slice(0, Math.max(0, cuantos));
}

/** Cómo se ordena el bloque de resultados de Inicio. */
export type ModoResultados = "cp" | "recientes";

/** Lee el modo de la URL. Cualquier otra cosa cae en «más CP». */
export const asModoResultados = (v: string | undefined | null): ModoResultados =>
  v === "recientes" ? "recientes" : "cp";

/**
 * El puesto en texto, o un guion.
 *
 * Nulo y cero no son lo mismo: un resultado puede tener CP sin puesto
 * apuntado (los CP se metieron a mano). Poner «0.º» sería inventarse un
 * dato; el guion dice lo que hay.
 */
export function puestoTexto(puesto: number | null): string {
  return puesto && puesto > 0 ? `${puesto}.º` : "—";
}
