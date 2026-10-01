/* =========================================================================
   v0.15 — Salir primero o segundo, contado desde TU lado.

   EL FALLO QUE ARREGLA
   --------------------
   La ficha del torneo decía «De las 3 rondas en las que apuntaste quién salía
   primero, ganaste el 33% de las que empezaste tú». La cifra salía de
   `firstTurnSeriesStats`, que mide otra cosa: **cuántas veces ganó quien
   empezó**, fuera quien fuera. Si empezaste una y la ganaste, y el rival
   empezó las otras dos y las ganaste tú también, aquello decía 33% cuando
   habías ganado el 100% de las que empezaste. El mensaje no cuadraba porque
   la pregunta y la respuesta eran de dos cálculos distintos.

   Esto cuenta las dos cosas por separado, con su denominador a la vista:
   «Saliendo 1.º: 1 de 1 · Saliendo 2.º: 2 de 2».

   Las rondas empatadas o abiertas no entran en ninguno de los dos lados: no
   son ni una victoria ni una derrota saliendo primero.

   Sin imports, como el resto de módulos probados.
   ========================================================================= */

export type RondaTurno = {
  /** ¿Salí yo primero en el juego 1? null = no se apuntó. */
  firstGameOne: boolean | null;
  /** Desde mi lado. */
  result: "w" | "l" | "d" | null;
};

export type LadoTurno = { jugadas: number; ganadas: number; tasa: number | null };

export type PrimerTurno = {
  primero: LadoTurno;
  segundo: LadoTurno;
  /** Rondas con turno apuntado y resultado decidido (sin empates). */
  total: number;
};

const lado = (jugadas: number, ganadas: number): LadoTurno => ({
  jugadas, ganadas, tasa: jugadas ? ganadas / jugadas : null,
});

export function primerTurno(rondas: RondaTurno[]): PrimerTurno {
  let p = 0, pg = 0, s = 0, sg = 0;
  for (const r of rondas) {
    if (r.firstGameOne == null) continue;
    if (r.result !== "w" && r.result !== "l") continue;
    if (r.firstGameOne) { p++; if (r.result === "w") pg++; }
    else { s++; if (r.result === "w") sg++; }
  }
  return { primero: lado(p, pg), segundo: lado(s, sg), total: p + s };
}

/** «1 de 3 (33%)», o «—» si no hay ninguna. */
export function textoLado(l: LadoTurno): string {
  if (!l.jugadas) return "—";
  return `${l.ganadas} de ${l.jugadas} (${Math.round((l.tasa ?? 0) * 100)}%)`;
}
