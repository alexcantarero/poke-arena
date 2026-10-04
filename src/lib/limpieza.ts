/* =========================================================================
   v0.19 — Torneos abandonados.

   Regla: un torneo creado hace MÁS de 3 días sin ninguna participación (ni
   un resultado ni una ronda apuntada) se borra.

   Excepción a propósito: los torneos cuya fecha todavía no ha llegado. Un
   Regional apuntado con un mes de antelación no tiene participación hasta el
   día del torneo, y borrarlo a los tres días de crearlo sería borrar el
   calendario. Para ellos los 3 días cuentan desde la fecha del torneo.
   (Si se quiere la regla literal, `respetarFuturos: false`.)

   Sin imports: lo cargan los tests.
   ========================================================================= */

export const DIAS_GRACIA = 3;

export type TorneoLimpieza = { id: string; createdAt: Date | string; date: string; endDate?: string | null };

export function torneosAbandonados(
  torneos: TorneoLimpieza[],
  conParticipacion: Set<string>,
  ahora: Date,
  { dias = DIAS_GRACIA, respetarFuturos = true }: { dias?: number; respetarFuturos?: boolean } = {},
): string[] {
  const limite = ahora.getTime() - dias * 86_400_000;
  return torneos
    .filter((t) => {
      if (conParticipacion.has(t.id)) return false;
      if (new Date(t.createdAt).getTime() > limite) return false;
      if (respetarFuturos) {
        // El último día del torneo, a última hora, más los días de gracia.
        const fin = new Date(`${t.endDate || t.date}T23:59:59Z`).getTime();
        if (Number.isFinite(fin) && fin > limite) return false;
      }
      return true;
    })
    .map((t) => t.id);
}
