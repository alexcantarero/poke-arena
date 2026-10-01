/* =========================================================================
   v0.16 — Rangos de puesto para las medallas de CP.

   Dos escalas, según el tamaño del evento:

   · REGIONALES (y Special, Internacional y Mundial): escala de diez rangos
     por potencias de dos, con la paleta de la imagen de referencia de rangos
     competitivos que pasó Alex. Un Regional tiene miles de personas: un
     podio de tres metales dejaría a casi todos los resultados con premio en
     el mismo gris.

         1.º Challenger · Top 4 GrandMaster · Top 8 Master · Top 16 Diamante
         Top 32 Esmeralda · Top 64 Platino · Top 128 Oro · Top 256 Plata
         Top 512 Bronce · Top 1024 Hierro

     «Top N» = puesto ≤ N. Del 1025 para abajo no hay rango.

   · CHALLENGES y CUPS: podio. 1.º oro (maxeado), 2.º plata, 3.º–4.º bronce,
     y lo demás que puntúa en «acero»: un azul oscuro mate que no se
     confunde con la plata (antes era un gris claro casi igual).

   Sin imports, como el resto de módulos probados.
   ========================================================================= */

export type Rango = {
  /** Clave estable, también el sufijo de la clase CSS `cp-rank-<clave>`. */
  clave: string;
  nombre: string;
  /** Puesto máximo que entra en el rango. */
  hasta: number;
};

export const RANGOS_REGIONAL: Rango[] = [
  { clave: "challenger", nombre: "Challenger", hasta: 1 },
  { clave: "grandmaster", nombre: "GrandMaster", hasta: 4 },
  { clave: "master", nombre: "Master", hasta: 8 },
  { clave: "diamond", nombre: "Diamante", hasta: 16 },
  { clave: "emerald", nombre: "Esmeralda", hasta: 32 },
  { clave: "platinum", nombre: "Platino", hasta: 64 },
  { clave: "gold", nombre: "Oro", hasta: 128 },
  { clave: "silver", nombre: "Plata", hasta: 256 },
  { clave: "bronze", nombre: "Bronce", hasta: 512 },
  { clave: "iron", nombre: "Hierro", hasta: 1024 },
];

const GRANDES = new Set(["regional", "special", "international", "worlds"]);

/** ¿Este tipo de evento usa la escala de rangos de Regional? */
export function usaEscalaRegional(kind: string): boolean {
  return GRANDES.has(kind);
}

/** El rango de Regional de un puesto, o null si no llega a Top 1024. */
export function rangoRegional(placement: number | null | undefined): Rango | null {
  if (placement == null || placement < 1) return null;
  return RANGOS_REGIONAL.find((r) => placement <= r.hasta) ?? null;
}

/** Texto del tramo: «Top 512», o «1.º» para el ganador. */
export function textoRango(r: Rango): string {
  return r.hasta === 1 ? "1.º" : `Top ${r.hasta}`;
}

/**
 * La medalla de un resultado que puntúa. Devuelve la clase CSS y el nombre
 * para el tooltip.
 *
 * Para Challenge y Cup manda el tramo de la tabla de CP (`tierIndex`: 0 = el
 * 1.º): así un 3.º y un 4.º, que dan lo mismo, llevan la misma medalla.
 */
export function medallaDe(
  kind: string,
  placement: number | null | undefined,
  tierIndex: number,
): { className: string; nombre: string } {
  if (usaEscalaRegional(kind)) {
    const r = rangoRegional(placement);
    return r
      ? { className: `cp-rank-${r.clave}`, nombre: `${r.nombre} · ${textoRango(r)}` }
      : { className: "cp-rank-steel", nombre: "Sin rango" };
  }
  if (tierIndex === 0) return { className: "cp-rank-gold", nombre: "Oro · 1.º" };
  if (tierIndex === 1) return { className: "cp-rank-silver", nombre: "Plata · 2.º" };
  if (tierIndex === 2) return { className: "cp-rank-bronze", nombre: "Bronce · Top 4" };
  return { className: "cp-rank-steel", nombre: "Acero" };
}
