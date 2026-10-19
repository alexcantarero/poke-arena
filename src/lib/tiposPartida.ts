/* =========================================================================
   De qué tipo es cada partida, y de qué color se pinta.

   Sin imports, como el resto de módulos que se prueban.

   v0.50. Las gráficas separaban «Liga» de «Torneos», y en «Torneos» caía
   todo lo que no era de liga: también los AMISTOSOS. Y no distinguía un
   torneo online de uno presencial. Ahora son cuatro tipos, con el mismo
   color en todas las gráficas:

     · liga        azul     — una competición interna
     · presencial  marrón   — un torneo de fuera, en persona
     · online      verde    — un torneo de fuera, por internet
     · amistoso    gris     — ni liga ni torneo
   ========================================================================= */

export type TipoPartida = "liga" | "presencial" | "online" | "amistoso";

export const TIPOS_PARTIDA: readonly TipoPartida[] = ["liga", "presencial", "online", "amistoso"];

/** El color de cada tipo. Variables del tema, para que el modo oscuro funcione. */
export const COLOR_TIPO: Record<TipoPartida, string> = {
  liga: "var(--info)",
  presencial: "#9a6a2c",
  online: "var(--win)",
  amistoso: "var(--muted)",
};

/** La clave de traducción del nombre de cada tipo. */
export const CLAVE_TIPO: Record<TipoPartida, string> = {
  liga: "tipo.liga", presencial: "tipo.presencial", online: "tipo.online", amistoso: "tipo.amistoso",
};

/**
 * El tipo de una partida.
 *
 * La liga manda: una partida con competición es de liga aunque tenga torneo.
 * Un torneo es online si su id está en `torneosOnline`; si no, presencial.
 */
export function tipoDePartida(
  m: { competitionId?: string | null; tournamentId?: string | null },
  torneosOnline: ReadonlySet<string>,
): TipoPartida {
  if (m.competitionId) return "liga";
  if (m.tournamentId) return torneosOnline.has(m.tournamentId) ? "online" : "presencial";
  return "amistoso";
}
