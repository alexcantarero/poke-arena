/* =========================================================================
   v0.17 — Dónde estás respecto a las plazas del Mundial.

   Desde 2026 la invitación por puntos es «Top N del leaderboard de tu zona»
   (en 2027, Masters de Europa: Top 140). No hay una cifra de CP que alcanzar:
   la línea en puntos solo se conoce al cerrar la temporada. Lo único que se
   puede decir con verdad es dónde está cada uno AHORA respecto a ese N.

   El puesto lo apunta cada uno a mano: Play! Pokémon no tiene API pública
   del leaderboard y pokemon.com prohíbe la extracción automatizada.

   Sin imports a propósito: así lo cargan los tests directamente y sirve
   también en el navegador.
   ========================================================================= */

export type EstadoMundial =
  | { tipo: "sin-dato" }
  | { tipo: "sin-plazas"; puesto: number }
  | { tipo: "dentro"; puesto: number; plazas: number; margen: number }
  | { tipo: "fuera"; puesto: number; plazas: number; faltan: number };

/**
 * `puesto` 1-based; `plazas` las invitaciones por leaderboard de la zona.
 * `margen` = cuántos puestos puedes bajar y seguir dentro (0 = estás justo en
 * la última plaza). `faltan` = cuántos puestos tienes que subir para entrar.
 */
export function estadoMundial(
  puesto: number | null | undefined,
  plazas: number | null | undefined,
): EstadoMundial {
  if (puesto == null || !Number.isFinite(puesto) || puesto < 1) return { tipo: "sin-dato" };
  const p = Math.floor(puesto);
  if (plazas == null || !Number.isFinite(plazas) || plazas < 1) return { tipo: "sin-plazas", puesto: p };
  const n = Math.floor(plazas);
  return p <= n
    ? { tipo: "dentro", puesto: p, plazas: n, margen: n - p }
    : { tipo: "fuera", puesto: p, plazas: n, faltan: p - n };
}

/**
 * Ordena por puesto en Europa: primero quien tiene puesto (de mejor a peor),
 * detrás quien no lo ha apuntado, por nombre.
 */
export function porPuestoZona<T extends { name: string; rankEurope: number | null }>(a: T, b: T): number {
  const pa = a.rankEurope ?? Number.POSITIVE_INFINITY;
  const pb = b.rankEurope ?? Number.POSITIVE_INFINITY;
  if (pa !== pb) return pa < pb ? -1 : 1;
  return a.name.localeCompare(b.name, "es");
}
