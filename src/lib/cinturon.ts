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

/* v0.115 — el Cinturón Elo mide forma y actividad: puede retar quien está en
   el top 5 de FORMA (`lib/forma.ts`) o tiene al menos 1200 de forma. Antes
   era el top 5 de la liga o 1100 de Elo. Como la Forma baja con la
   inactividad, un campeón que deja de jugar se queda sin aspirantes que lo
   reten… y acaba vacante por el plazo de seis semanas. */
export const CINTURON_FORMA_MIN = 1200;

export function cumpleRequisitoReto(posicionForma: number | null, forma: number | null): boolean {
  return (posicionForma !== null && posicionForma <= 5) || (forma !== null && forma >= CINTURON_FORMA_MIN);
}

/** v0.115 — tu puesto en la clasificación de Forma entre los jugadores activos (1 = el mejor). */
export function posicionEnForma(formas: Record<string, { forma: number }>, activos: string[], id: string): number | null {
  const orden = activos.filter((p) => formas[p]).sort((x, y) => formas[y].forma - formas[x].forma || x.localeCompare(y));
  const i = orden.indexOf(id);
  return i >= 0 ? i + 1 : null;
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
