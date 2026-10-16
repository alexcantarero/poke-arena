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

/* =========================================================================
   v0.45 — Torneos que se quedaron abiertos.

   Regla: un torneo EN CURSO (`open`) con participación, cuya fecha pasó
   hace más de una semana, se cierra solo.

   Por qué hace falta: cerrar un torneo es un botón que nadie se acuerda de
   pulsar. Y uno abierto para siempre sigue saliendo como «en curso» en la
   portada, sigue aceptando rondas, y su camino al corte sigue enseñándose
   como si quedara algo por jugar.

   Qué NO toca, a propósito:
     · Los BORRADORES: el reglamento de la app solo deja cerrar desde «en
       curso» (`STATUS_FLOW`), y un borrador con fecha pasada es un torneo
       que no se llegó a empezar, no uno que se olvidó cerrar.
     · Los que no tienen participación: esos los BORRA `torneosAbandonados`,
       a los tres días. Cerrar uno vacío sería guardar un torneo que no tiene
       nada dentro.
     · Los de varios días se miden desde el ÚLTIMO día, no el primero.
   ========================================================================= */

export const DIAS_PARA_CERRAR = 7;

export type TorneoCierre = { id: string; status: string; date: string; endDate?: string | null };

export function torneosParaCerrar(
  torneos: TorneoCierre[],
  conParticipacion: Set<string>,
  ahora: Date,
  dias = DIAS_PARA_CERRAR,
): string[] {
  const limite = ahora.getTime() - dias * 86_400_000;
  return torneos
    .filter((t) => {
      if (t.status !== "open") return false;
      if (!conParticipacion.has(t.id)) return false;
      const fin = new Date(`${t.endDate || t.date}T23:59:59Z`).getTime();
      return Number.isFinite(fin) && fin < limite;
    })
    .map((t) => t.id);
}
