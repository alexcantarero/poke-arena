/* =========================================================================
   v0.25 — Mazo por juego dentro de una serie de liga.

   Regla: en cada juego cada jugador elige libremente su arquetipo, EXCEPTO
   uno con el que ya haya GANADO un juego de esa misma serie. Perder con un
   mazo no lo bloquea; un empate tampoco. Cuenta el arquetipo exacto (no la
   familia). La regla es de cada jugador, por separado.

   Sin imports: lo cargan los tests.
   ========================================================================= */

export type JuegoMazos = { winner: string; archA: string | null; archB: string | null };

/** Arquetipos que `lado` ya no puede usar en el juego `i` (0-based). */
export function bloqueados(juegos: JuegoMazos[], i: number, lado: "a" | "b"): Set<string> {
  const out = new Set<string>();
  for (let k = 0; k < i && k < juegos.length; k++) {
    const g = juegos[k];
    const arch = lado === "a" ? g.archA : g.archB;
    if (arch && g.winner === lado) out.add(arch);
  }
  return out;
}

/** El primer incumplimiento, o null si la serie es válida. */
export function validarMazosPorJuego(juegos: JuegoMazos[]): { juego: number; lado: "a" | "b"; arch: string } | null {
  for (let i = 0; i < juegos.length; i++) {
    for (const lado of ["a", "b"] as const) {
      const arch = lado === "a" ? juegos[i].archA : juegos[i].archB;
      if (arch && bloqueados(juegos, i, lado).has(arch)) return { juego: i + 1, lado, arch };
    }
  }
  return null;
}
