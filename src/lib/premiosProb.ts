/* =========================================================================
   v0.136 — ¿QUÉ TENGO EN PREMIOS? La calculadora de premios.

   Sin imports, para probarlo.

   Durante la partida vas viendo cartas (mano, banca, descarte, lo que has
   buscado). Las que NO has visto están repartidas entre el mazo y los premios
   boca abajo. Si de una carta llevas `c` copias y has visto `k`, quedan
   n = c − k sin ver, mezcladas entre las U cartas desconocidas, de las que P
   son premios. Como cualquier subconjunto de P de esas U es igual de probable
   (hipergeométrica):

       P(ninguna en premios) = C(U − n, P) / C(U, P)
       P(alguna en premios)  = 1 − lo de arriba
       copias esperadas en premios = n · P / U

   SUPUESTO, dicho en la pantalla: que lo que has visto no da pistas de dónde
   están las demás. Es exacto si has robado y buscado al azar; si buscaste
   una carta concreta y no salía, ya sabes algo más (probablemente está en
   premios) y la cuenta se queda corta.
   ========================================================================= */

/** C(n, k) sin desbordar: en cociente, porque solo se usa dividida por otra combinación. */
function logComb(n: number, k: number): number {
  if (k < 0 || k > n) return -Infinity;
  let s = 0;
  for (let i = 1; i <= k; i++) s += Math.log(n - k + i) - Math.log(i);
  return s;
}

export type PremioCarta = {
  /** Probabilidad de que al menos una copia sin ver esté en premios. */
  alguna: number;
  /** Probabilidad de que TODAS las copias sin ver estén en premios (la carta está «muerta»). */
  todas: number;
  /** Copias esperadas en premios. */
  esperadas: number;
  sinVer: number;
};

/**
 * @param copias copias de la carta en el mazo
 * @param vistas copias ya vistas (no pueden estar en premios)
 * @param desconocidas cartas que no has visto en total (mazo + premios boca abajo)
 * @param premios premios que siguen boca abajo
 */
export function probPremios(copias: number, vistas: number, desconocidas: number, premios: number): PremioCarta {
  const n = Math.max(0, Math.round(copias) - Math.max(0, Math.round(vistas)));
  const U = Math.max(0, Math.round(desconocidas)), P = Math.max(0, Math.min(Math.round(premios), U));
  if (n === 0 || P === 0 || U === 0) return { alguna: 0, todas: n === 0 ? 0 : 0, esperadas: 0, sinVer: n };
  const nn = Math.min(n, U);
  const ninguna = Math.exp(logComb(U - nn, P) - logComb(U, P));
  // Todas las n en premios: elegir esas n entre los P huecos → C(U − n, P − n) / C(U, P).
  const todas = nn > P ? 0 : Math.exp(logComb(U - nn, P - nn) - logComb(U, P));
  return { alguna: 1 - ninguna, todas, esperadas: (nn * P) / U, sinVer: n };
}

/**
 * Cuántas cartas no has visto todavía: el mazo entero menos las vistas.
 * Lo normal en partida: 60 − (mano + banca + descarte + premios ya cogidos + lo que esté fuera de juego).
 */
export function desconocidasDe(total: number, vistasTotales: number): number {
  return Math.max(0, Math.round(total) - Math.max(0, Math.round(vistasTotales)));
}
