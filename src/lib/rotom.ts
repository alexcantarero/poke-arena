/* =========================================================================
   v0.95 — Los Rotom del panel de uso.

   Sin imports. Cada forma de Rotom vive dentro de un aparato, y cada aparato
   cuida de un límite del plan gratuito:

     · Rotom Calor (horno)        → CPU activa de Vercel
     · Rotom Lavado (lavadora)    → la base de datos de Neon (cómputo)
     · Rotom Ventilador           → tráfico de red
     · Rotom Frío (frigorífico)   → almacenamiento: lo que se guarda
     · Rotom Corte (cortacésped)  → invocaciones: muchas y pequeñas
     · Rotom (sin aparato)        → la memoria y la cabecera del panel

   Sprites oficiales de PokéAPI (github.com/PokeAPI/sprites), los mismos que ya
   usan los logros. Los números de las formas son los ids de PokéAPI.
   ========================================================================= */

export const ROTOM = {
  base: 479,
  calor: 10008,
  lavado: 10009,
  frio: 10010,
  ventilador: 10011,
  corte: 10012,
} as const;

export type FormaRotom = keyof typeof ROTOM;

export const spriteRotom = (forma: FormaRotom) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${ROTOM[forma]}.png`;

/** Qué Rotom cuida de cada límite (claves de `LIMITES` en `usoLimites.ts`). */
export const ROTOM_DE: Record<string, FormaRotom> = {
  invocaciones: "corte",
  cpuHoras: "calor",
  memoriaGBh: "base",
  cuHoras: "lavado",
  transferGB: "ventilador",
  almacenGB: "frio",
};
