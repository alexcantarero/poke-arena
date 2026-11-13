/* =========================================================================
   v0.120 — Cuándo recordar algo a un jugador. Sin imports, para probarlo.

   · Nick de Limitless: si no lo tiene, siempre (es lo que permite traer sus
     torneos online). «Más tarde» lo esconde un día.
   · Rango del ladder: una vez por semana. Sale si nunca lo ha puesto o si
     hace 7 días o más que no lo actualiza, y «Recordar la semana que viene»
     lo calla 7 días.
   · v0.124 — RESET del ladder: durante las tres semanas siguientes a un reset,
     quien todavía no ha puesto su rango nuevo ve un aviso destacado. «Más
     tarde» lo calla un día (y solo si se pulsó después de ESE reset). En
     Discord, además del anuncio al hacer el reset, un recordatorio cada lunes
     de esas tres semanas mientras quede alguien sin rango.
   ========================================================================= */

const DIA = 86_400_000;

export const LADDER_CADA_DIAS = 7;
export const NICK_POSPONER_DIAS = 1;

const ms = (x: string | Date | null | undefined): number | null => {
  if (!x) return null;
  const t = x instanceof Date ? x.getTime() : Date.parse(x);
  return Number.isFinite(t) ? t : null;
};

/** ¿Hay que recordarle que actualice el rango del ladder? */
export function tocaRecordarLadder(actualizado: string | Date | null | undefined, pospuesto: string | null, ahora: number): boolean {
  const p = ms(pospuesto);
  if (p != null && ahora - p < LADDER_CADA_DIAS * DIA) return false;
  const a = ms(actualizado);
  return a == null || ahora - a >= LADDER_CADA_DIAS * DIA;
}

/** v0.124 — cuántos días se insiste tras un reset (después sigue el recordatorio semanal de siempre). */
export const RESET_AVISO_DIAS = 21;
export const RESET_POSPONER_DIAS = 1;

/** ¿Sigue «reciente» el reset? (para el aviso de la web y el recordatorio de Discord). */
export function resetReciente(reset: string | Date | null | undefined, ahora: number): boolean {
  const r = ms(reset);
  return r != null && r <= ahora && ahora - r < RESET_AVISO_DIAS * DIA;
}

/**
 * v0.124 — ¿Hay que avisarle de que hubo un reset del ladder? Sí mientras el
 * reset sea reciente y no tenga rango (el reset se lo quita a todos; en cuanto
 * pone el nuevo, deja de salir).
 */
export function tocaAvisarReset(
  reset: string | Date | null | undefined, rango: number | null | undefined, pospuesto: string | null, ahora: number,
): boolean {
  if (rango != null || !resetReciente(reset, ahora)) return false;
  const p = ms(pospuesto);
  // Un «más tarde» de ANTES de este reset no vale: era de otro aviso.
  return p == null || p < (ms(reset) ?? 0) || ahora - p >= RESET_POSPONER_DIAS * DIA;
}

/** ¿Hay que pedirle el nick de Limitless? */
export function tocaPedirNick(nick: string | null | undefined, pospuesto: string | null, ahora: number): boolean {
  if (nick && nick.trim()) return false;
  const p = ms(pospuesto);
  return p == null || ahora - p >= NICK_POSPONER_DIAS * DIA;
}
