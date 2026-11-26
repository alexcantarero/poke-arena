/* =========================================================================
   v0.137 — LA DIFICULTAD DE UN MAZO: cinco niveles, votada por todos.

   Sin imports, para probarlo. Cada jugador vota un nivel (1 muy fácil … 5 muy
   difícil) y el mazo enseña la MEDIA, redondeada al nivel más cercano, con
   cuántos votos hay detrás. Un voto por persona: volver a votar lo cambia.
   ========================================================================= */

export const NIVELES_DIFICULTAD = [1, 2, 3, 4, 5] as const;
export type NivelDificultad = (typeof NIVELES_DIFICULTAD)[number];

/** Clave de texto de cada nivel (para i18n) y su color: de verde a rojo. */
export const DIFICULTAD: Record<NivelDificultad, { clave: string; color: string }> = {
  1: { clave: "v137.dif.1", color: "#16a34a" },
  2: { clave: "v137.dif.2", color: "#65a30d" },
  3: { clave: "v137.dif.3", color: "#d97706" },
  4: { clave: "v137.dif.4", color: "#ea580c" },
  5: { clave: "v137.dif.5", color: "#dc2626" },
};

export function nivelValido(x: unknown): NivelDificultad | null {
  const n = Number(x);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? (n as NivelDificultad) : null;
}

export type ResumenDificultad = { media: number; nivel: NivelDificultad; votos: number };

/** La media de los votos válidos y el nivel que le toca (redondeo al más cercano; .5 sube). Null sin votos. */
export function resumenDificultad(votos: readonly number[]): ResumenDificultad | null {
  const vs = votos.map(nivelValido).filter((x): x is NivelDificultad => x != null);
  if (!vs.length) return null;
  const media = vs.reduce((a, b) => a + b, 0) / vs.length;
  const nivel = Math.min(5, Math.max(1, Math.floor(media + 0.5))) as NivelDificultad;
  return { media, nivel, votos: vs.length };
}
