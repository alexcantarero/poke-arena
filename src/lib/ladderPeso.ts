/* =========================================================================
   v0.137 — EL LADDER PONDERA EL PTCG LIVE. Una victoria a 1700 no vale lo
   mismo que a 200: cada sesión del Live que se apunta lleva sus fechas, la
   app saca el rango del ladder de esas fechas y pesa sus partidas.

   Sin imports, para probarlo.

   LOS PESOS (fijados el 25/11/2026, a petición de Ibai; se pueden ajustar):
     sin rango conocido     1,0   (no se castiga lo que no se sabe)
     Novato (≤ 550)         0,5
     1350–1499 (Hierro)     0,8
     1500–1599              1,0
     1600–1699              1,15
     1700–1799              1,3
     1800–1899              1,45
     1900–1999              1,6
     2000 o más             1,8
   (El ladder salta de 550 a 1500 y desde ahí puede bajar hasta 1350: entre
   551 y 1349 no hay nadie; si apareciera, cuenta como Hierro.)
   ========================================================================= */

export function pesoLadder(rango: number | null | undefined): number {
  if (rango == null || !Number.isFinite(rango)) return 1;
  if (rango <= 550) return 0.5;
  if (rango < 1500) return 0.8;
  if (rango < 1600) return 1;
  if (rango < 1700) return 1.15;
  if (rango < 1800) return 1.3;
  if (rango < 1900) return 1.45;
  if (rango < 2000) return 1.6;
  return 1.8;
}

export type EntradaLadder = { elo: number; fecha: string };

/**
 * El rango representativo de un periodo: la media de las actualizaciones
 * hechas entre `desde` y `hasta` (ambos incluidos); si no hubo ninguna, la
 * última anterior a `desde` (era el rango con el que se empezó); si tampoco,
 * `actual`. Null si no hay nada.
 */
export function rangoDelPeriodo(entradas: readonly EntradaLadder[], desde: string, hasta: string, actual: number | null = null): number | null {
  const dentro = entradas.filter((e) => e.fecha >= desde && e.fecha <= hasta);
  if (dentro.length) return Math.round(dentro.reduce((a, e) => a + e.elo, 0) / dentro.length);
  const antes = entradas.filter((e) => e.fecha < desde).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
  if (antes) return antes.elo;
  return actual;
}

export type SesionLive = { wins: number; losses: number; rango: number | null };

/**
 * Las cuentas del Live de un mazo (o arquetipo): las sesiones, cada una con su
 * peso, y lo que haya en el total del mazo que no venga de ninguna sesión (lo
 * apuntado antes de la v0.137), a peso 1.
 */
export function liveConPeso(sesiones: readonly SesionLive[], totalW = 0, totalL = 0) {
  let w = 0, l = 0, pw = 0, pj = 0;
  for (const s of sesiones) {
    const p = pesoLadder(s.rango);
    w += s.wins; l += s.losses; pw += s.wins * p; pj += (s.wins + s.losses) * p;
  }
  const restoW = Math.max(0, totalW - w), restoL = Math.max(0, totalL - l);
  w += restoW; l += restoL; pw += restoW; pj += restoW + restoL;
  return { wins: w, losses: l, played: w + l, pctPonderado: pj > 0 ? pw / pj : null, pctSimple: w + l > 0 ? w / (w + l) : null };
}
