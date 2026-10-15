/* =========================================================================
   Una escala que no deje que un día raro aplaste a los demás.

   Sin imports, como el resto de módulos que se prueban.

   El problema que resuelve: la gráfica de actividad de Estadísticas dejaba
   que Recharts eligiera el eje solo, así que el máximo era el día más alto.
   Con una media de 2,7 partidas al día y un solo día con unas 90, los otros
   29 quedaban pegados al suelo y la gráfica no enseñaba nada salvo el pico.

   La solución estándar es recortar la escala por encima de lo normal y
   DECIR que se ha recortado: el dato no se esconde, se pone en texto. Una
   gráfica que oculta un valor sin avisar miente; una que lo recorta y lo
   dice, no.
   ========================================================================= */

export type Escala = {
  /** Techo del eje. `null` = que lo decida la gráfica (no hace falta recortar). */
  techo: number | null;
  /** Índices de los valores que quedan por encima del techo. */
  fuera: number[];
};

/** Percentil por interpolación lineal sobre una copia ordenada. */
export function percentil(valores: readonly number[], p: number): number {
  if (!valores.length) return 0;
  const v = [...valores].sort((a, b) => a - b);
  const pos = (v.length - 1) * Math.min(1, Math.max(0, p));
  const i = Math.floor(pos);
  const resto = pos - i;
  return i + 1 < v.length ? v[i] + (v[i + 1] - v[i]) * resto : v[i];
}

/**
 * Decide si hay que recortar la escala y dónde.
 *
 * Solo recorta cuando de verdad hay un valor atípico: el máximo tiene que
 * pasar de **tres veces el percentil 75**, y además de un mínimo absoluto.
 * Sin ese mínimo, una serie de ceros y unos con un solo tres se trataría
 * como si el tres fuera atípico, y no lo es.
 *
 * Percentil 75 y no 90, y la prueba lo demostró: con dos días disparados de
 * doce, los propios atípicos ya son el 17 % de la serie y arrastran el
 * percentil 90 hacia arriba, así que la regla dejaba de verlos. El 75 aguanta
 * hasta un cuarto de días raros antes de contaminarse.
 *
 * El techo queda en el doble del percentil 75, redondeado hacia arriba, para
 * que los días normales ocupen media gráfica y se lean.
 */
export function escalaRobusta(valores: readonly number[], minimo = 5): Escala {
  if (valores.length < 4) return { techo: null, fuera: [] };

  const max = Math.max(...valores);
  const p75 = percentil(valores, 0.75);
  const techoNormal = Math.max(minimo, Math.ceil(p75 * 2));

  if (max <= Math.max(minimo, p75 * 3)) return { techo: null, fuera: [] };

  const fuera = valores.flatMap((v, i) => (v > techoNormal ? [i] : []));
  return { techo: techoNormal, fuera };
}
