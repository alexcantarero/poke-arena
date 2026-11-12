/* =========================================================================
   v0.123 — Por qué se pierde: etiquetas de causa de una derrota (o de un mal
   resultado). Sin imports, para probarlo.

   Se guardan por partida y por jugador (el que perdió), en la tabla
   `match_causas` (migración 0035). Son opcionales y se pueden marcar varias.
   ========================================================================= */

export const CAUSAS_DERROTA = [
  "matchup", "misplay", "mulligan", "varianza", "robos", "topdeck",
  "premios", "thinning", "lista", "tiempo", "otro",
] as const;

export type CausaDerrota = (typeof CAUSAS_DERROTA)[number];

const VALIDAS = new Set<string>(CAUSAS_DERROTA);

/** De lo que llega del formulario («matchup,misplay»), solo las válidas, sin repetir y en el orden de la lista. */
export function leerCausas(texto: string | null | undefined): CausaDerrota[] {
  const elegidas = new Set(String(texto ?? "").split(/[,\s]+/).map((x) => x.trim().toLowerCase()).filter((x) => VALIDAS.has(x)));
  return CAUSAS_DERROTA.filter((c) => elegidas.has(c));
}

/** Cuántas veces sale cada causa, de más a menos (a igualdad, en el orden de la lista). */
export function contarCausas(filas: ReadonlyArray<{ causas: readonly string[] }>): Array<{ causa: CausaDerrota; n: number; pct: number }> {
  const n = new Map<CausaDerrota, number>();
  let conCausa = 0;
  for (const f of filas) {
    const cs = leerCausas(f.causas.join(","));
    if (cs.length) conCausa++;
    for (const c of cs) n.set(c, (n.get(c) ?? 0) + 1);
  }
  return CAUSAS_DERROTA
    .filter((c) => n.has(c))
    .map((c) => ({ causa: c, n: n.get(c)!, pct: conCausa ? n.get(c)! / conCausa : 0 }))
    .sort((a, b) => b.n - a.n || CAUSAS_DERROTA.indexOf(a.causa) - CAUSAS_DERROTA.indexOf(b.causa));
}

/**
 * v0.123 — Resultados especiales de una partida. Un «no presentado» se guarda
 * como partida cerrada con resultado declarado y SIN juegos ni mazos, con una
 * nota que empieza por «No presentado». Cuenta para la clasificación (gana el
 * que sí fue) pero no para el Elo ni para las estadísticas de mazos.
 */
export const PREFIJO_NO_PRESENTADO = "No presentado";

export function esNoPresentado(nota: string | null | undefined): boolean {
  return /^\s*no presentad[oa]\b/i.test(nota ?? "");
}
