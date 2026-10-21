/* =========================================================================
   Marcadores de una serie: cuáles valen y cómo se reparten los juegos.

   Sin imports, como el resto de módulos que se prueban.

   v0.54. Lo usa el resultado rápido desde la lista de pendientes. El orden
   real de los juegos no se conoce en modo rápido: se alternan y el último lo
   gana quien gana la serie. Así cuadran el marcador y la diferencia de juegos
   del ranking, que es lo que importa.
   ========================================================================= */

/** Los marcadores posibles, del que más gana el lado A al que más pierde. */
export function marcadoresDe(bestOf: number): Array<[number, number]> {
  const need = Math.ceil(bestOf / 2);
  const out: Array<[number, number]> = [];
  for (let l = 0; l < need; l++) out.push([need, l]);
  for (let w = need - 1; w >= 0; w--) out.push([w, need]);
  return out;
}

/** Los ganadores juego a juego para un marcador: 2-1 → a, b, a. */
export function secuenciaDe(a: number, b: number): Array<"a" | "b"> {
  const gana = a > b ? "a" : "b", pierde = a > b ? "b" : "a";
  const seq: Array<"a" | "b"> = [];
  for (let k = 0; k < Math.min(a, b); k++) seq.push(gana, pierde);
  for (let g = Math.min(a, b); g < Math.max(a, b); g++) seq.push(gana);
  return seq;
}

/**
 * Lee un marcador del formulario: «2-1» o «empate». Solo valen los del
 * formato de la serie: un «3-0» en un Bo3 o un «1-1» no son resultados.
 */
export function leerMarcador(texto: string, bestOf: number): { a: number; b: number } | "empate" | null {
  if (texto === "empate") return "empate";
  const m = /^(\d)-(\d)$/.exec(texto);
  if (!m) return null;
  const a = Number(m[1]), b = Number(m[2]);
  return marcadoresDe(bestOf).some(([x, y]) => x === a && y === b) ? { a, b } : null;
}
