/* =========================================================================
   v0.120 — Cuándo recordar algo a un jugador. Sin imports, para probarlo.

   · Nick de Limitless: si no lo tiene, siempre (es lo que permite traer sus
     torneos online). «Más tarde» lo esconde un día.
   · Rango del ladder: una vez por semana. Sale si nunca lo ha puesto o si
     hace 7 días o más que no lo actualiza, y «Recordar la semana que viene»
     lo calla 7 días.
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

/** ¿Hay que pedirle el nick de Limitless? */
export function tocaPedirNick(nick: string | null | undefined, pospuesto: string | null, ahora: number): boolean {
  if (nick && nick.trim()) return false;
  const p = ms(pospuesto);
  return p == null || ahora - p >= NICK_POSPONER_DIAS * DIA;
}
