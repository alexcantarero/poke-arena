/* =========================================================================
   El resumen de cada competición en la pantalla de Liga.

   Sin imports, como el resto de módulos que se prueban.

   v0.43. La tarjeta de cada liga enseñaba el top 5 ordenado por PUNTOS pero
   con el %V como única cifra, así que un tercero con mejor porcentaje que el
   segundo parecía un error de la app. Y no decía nada de lo que uno quiere
   saber de un vistazo: cuánto falta para acabarla y si sigue viva.
   ========================================================================= */

/**
 * Cuántas series tiene una liga completa.
 *
 * Solo para «todos contra todos»: cada pareja se cruza una vez, n·(n−1)/2.
 * Para suizo, eliminatoria o duelo por equipos no hay un número fijo que se
 * pueda deducir de los jugadores, y es mejor no enseñar progreso que enseñar
 * uno inventado. `null` en esos casos.
 */
export function partidasEsperadas(
  kind: string,
  jugadores: number,
  modalidad?: string | null,
): number | null {
  if (kind !== "league" || modalidad === "equipos") return null;
  if (jugadores < 2) return null;
  return (jugadores * (jugadores - 1)) / 2;
}

export type Progreso = { jugadas: number; esperadas: number; fraccion: number };

/**
 * El progreso de la liga.
 *
 * `null` si no hay número esperado, y TAMBIÉN si se ha pasado: una liga que
 * juega a doble vuelta supera el n·(n−1)/2, y enseñar «120 %» sería afirmar
 * algo falso sobre cómo está montada. Mejor no decir nada.
 */
export function progresoLiga(jugadas: number, esperadas: number | null): Progreso | null {
  if (esperadas == null || esperadas <= 0 || jugadas > esperadas) return null;
  return { jugadas, esperadas, fraccion: jugadas / esperadas };
}

/** Días enteros entre dos fechas ISO cortas (`2026-10-15`). */
export function diasEntre(desde: string, hasta: string): number {
  const a = Date.parse(`${desde}T00:00:00Z`);
  const b = Date.parse(`${hasta}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

/** «hoy», «ayer», «hace 4 días». Sirve para ver si la liga sigue viva. */
export function actividadTexto(dias: number): string {
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  return `hace ${dias} días`;
}

/**
 * Las competiciones en el orden en que interesan: primero las que están en
 * curso, después las cerradas; dentro de cada grupo, la más reciente arriba.
 * Antes salían en el orden de la base de datos, y una liga de hace meses
 * podía quedar por encima de la que se está jugando.
 */
export function ordenarCompeticiones<T extends { status: string; start: string }>(cs: T[]): T[] {
  return [...cs].sort((x, y) =>
    Number(x.status === "done") - Number(y.status === "done") || y.start.localeCompare(x.start));
}
