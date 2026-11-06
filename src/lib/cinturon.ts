export const CINTURON_EVENT_ID = "cinturon-inaugural-2026";
export const CINTURON_COMPETITION_ID = "cinturon-inaugural-2026";
export const CINTURON_CIERRE_INSCRIPCION = "2026-11-20T08:00:00+01:00";
export const CINTURON_FECHA = "2026-11-20";
export const CINTURON_BYE = "BYE";
export const CINTURON_ESTADO_ID = "default";
export const CINTURON_RETO_DIAS = 10;
export const CINTURON_INACTIVIDAD_DIAS = 42;
export const CINTURON_ENFRIAMIENTO_DIAS = 30;

export function esCompeticionCinturon(id: string): boolean {
  return id === CINTURON_COMPETITION_ID || id.startsWith("cinturon-");
}

export function esDescansoCinturon(m: {
  status: string;
  playerBId: string | null;
  opponentName: string | null;
}): boolean {
  return m.status === "done" && m.playerBId === null
    && m.opponentName?.trim().toUpperCase() === CINTURON_BYE;
}

export function cumpleRequisitoReto(posicionLiga: number | null, elo: number | null): boolean {
  return (posicionLiga !== null && posicionLiga <= 5) || (elo !== null && elo >= 1100);
}

export function plazoVencido(desde: Date, dias: number, ahora: Date): boolean {
  return ahora.getTime() >= desde.getTime() + dias * 24 * 60 * 60 * 1000;
}

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
