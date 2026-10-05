/* =========================================================================
   v0.22 — La estación del año y las fechas señaladas, para los detalles del
   front: colores de acento, partículas que caen al fondo y el emblema junto
   a la marca. Hemisferio norte (la liga juega en España).

   Sin imports: lo cargan los tests.
   ========================================================================= */

export type EstacionId = "primavera" | "verano" | "otono" | "invierno";
export type EventoId = "halloween" | "navidad" | "mundial" | null;

export type Estacion = {
  id: EstacionId;
  nombre: string;
  /** Fecha señalada que manda sobre la estación (partículas y emblema). */
  evento: EventoId;
  /** Lo que cae al fondo. Decorativo: siempre `aria-hidden`. */
  particulas: string[];
  /** Emblema junto a la marca. */
  emblema: string;
};

const BASE: Record<EstacionId, Omit<Estacion, "evento">> = {
  primavera: { id: "primavera", nombre: "Primavera", particulas: ["🌸", "🌼", "🍃"], emblema: "🌸" },
  verano:    { id: "verano",    nombre: "Verano",    particulas: ["✦", "✧", "☀"],  emblema: "☀️" },
  otono:     { id: "otono",     nombre: "Otoño",     particulas: ["🍂", "🍁", "🍂"], emblema: "🍁" },
  invierno:  { id: "invierno",  nombre: "Invierno",  particulas: ["❄", "❅", "❆"],  emblema: "❄️" },
};

/** `iso` = YYYY-MM-DD (la fecha de hoy en Madrid). */
export function estacionDe(iso: string): Estacion {
  const m = Number(iso.slice(5, 7));
  const d = Number(iso.slice(8, 10));
  const md = m * 100 + d; // 1031 = 31 de octubre

  // Estaciones astronómicas, redondeadas al día 21.
  const id: EstacionId =
    md >= 321 && md < 621 ? "primavera"
    : md >= 621 && md < 921 ? "verano"
    : md >= 921 && md < 1221 ? "otono"
    : "invierno";

  const evento: EventoId =
    md >= 1024 && md <= 1101 ? "halloween"
    : md >= 1215 || md <= 106 ? "navidad"
    // El Mundial de Pokémon se juega a mediados de agosto.
    : md >= 810 && md <= 820 ? "mundial"
    : null;

  const base = BASE[id];
  if (evento === "halloween") return { ...base, evento, particulas: ["🎃", "🦇", "🍂"], emblema: "🎃" };
  if (evento === "navidad") return { ...base, evento, particulas: ["❄", "✨", "❅"], emblema: "🎄" };
  if (evento === "mundial") return { ...base, evento, particulas: ["🏆", "✦", "✧"], emblema: "🏆" };
  return { ...base, evento };
}
