export const CINTURON_EVENT_ID = "cinturon-inaugural-2026";
export const CINTURON_COMPETITION_ID = "cinturon-inaugural-2026";
export const CINTURON_CIERRE_INSCRIPCION = "2026-11-20T08:00:00+01:00";
export const CINTURON_FECHA = "2026-11-20";
export const CINTURON_BYE = "BYE";

export function inscripcionCinturonAbierta(ahora: Date): boolean {
  return ahora.getTime() < Date.parse(CINTURON_CIERRE_INSCRIPCION);
}

export function iniciarCinturonPermitido(ahora: Date): boolean {
  return !inscripcionCinturonAbierta(ahora);
}

export function incluirDescansosEnClasificacion<T extends {
  opponentName: string | null;
  playerBId: string | null;
}>(partidas: T[]): T[] {
  return partidas.map((partida) =>
    partida.playerBId === null && partida.opponentName?.trim().toUpperCase() === CINTURON_BYE
      ? { ...partida, playerBId: "__cinturon_bye__" }
      : partida,
  );
}
