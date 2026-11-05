/* =========================================================================
   v0.106 — «Iré / Quizá / No iré» en el calendario.

   Sin imports, para probarlo.

   Cada persona marca, para cada evento o torneo del calendario, si va a ir.
   Es suyo y privado: no se enseña a los demás (por ahora). Sirve para dos
   cosas: ver de un vistazo qué tiene apuntado, y QUITAR del calendario lo que
   ya ha descartado, que es lo que más ruido mete (el ejemplo real: 6–9
   Challenges por fin de semana en noviembre).

   El filtro va por URL (`?asist=`), como el resto de filtros de la app.
   ========================================================================= */

export const ESTADOS_ASISTENCIA = ["si", "quiza", "no"] as const;
export type EstadoAsistencia = (typeof ESTADOS_ASISTENCIA)[number];

export const esEstado = (v: unknown): v is EstadoAsistencia =>
  typeof v === "string" && (ESTADOS_ASISTENCIA as readonly string[]).includes(v);

/**
 * Los filtros, en el orden en que se ofrecen.
 *   · todo     — todo, también lo descartado (marcado).
 *   · sin-no   — todo MENOS lo que he dicho que no: «lo que puede que vaya y a lo que iré» + lo que no he mirado.
 *   · mios     — solo lo que he marcado como «iré» o «quizá».
 *   · si       — solo «iré».
 *   · no       — solo lo descartado (para recuperar algo).
 */
export const FILTROS_ASISTENCIA = ["todo", "sin-no", "mios", "si", "no"] as const;
export type FiltroAsistencia = (typeof FILTROS_ASISTENCIA)[number];

export function parseFiltroAsistencia(v: unknown): FiltroAsistencia {
  return typeof v === "string" && (FILTROS_ASISTENCIA as readonly string[]).includes(v) ? (v as FiltroAsistencia) : "todo";
}

/** ¿Se enseña un elemento con este estado bajo este filtro? `null` = sin marcar. */
export function pasaAsistencia(filtro: FiltroAsistencia, estado: EstadoAsistencia | null | undefined): boolean {
  const e = estado ?? null;
  switch (filtro) {
    case "sin-no": return e !== "no";
    case "mios": return e === "si" || e === "quiza";
    case "si": return e === "si";
    case "no": return e === "no";
    default: return true;
  }
}

/**
 * El siguiente estado al pulsar el mismo botón otra vez: pulsar «Iré» cuando
 * ya estaba en «Iré» lo desmarca (vuelve a sin marcar). Así no hace falta un
 * cuarto botón de «quitar».
 */
export function alternarEstado(actual: EstadoAsistencia | null | undefined, pulsado: EstadoAsistencia): EstadoAsistencia | null {
  return actual === pulsado ? null : pulsado;
}

/** Recuento para los chips del filtro (solo lo que viene; lo pasado no cuenta). */
export function contarAsistencia(ids: readonly string[], marcas: ReadonlyMap<string, EstadoAsistencia>) {
  const c = { si: 0, quiza: 0, no: 0, sinMarcar: 0 };
  for (const id of new Set(ids)) {
    const e = marcas.get(id);
    if (e) c[e]++; else c.sinMarcar++;
  }
  return c;
}

/** El id con que se guarda: los eventos y los torneos son tablas distintas y sus ids podrían chocar. */
export const claveAsistencia = (tipo: "evento" | "torneo", id: string) => `${tipo}:${id}`;
