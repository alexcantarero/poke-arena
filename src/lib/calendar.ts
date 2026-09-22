/* =========================================================================
   Los colores del calendario.

   Un calendario con todo del mismo color no se lee: hay que abrir cada cosa
   para saber qué es. Con un color por tipo de evento se ve de un vistazo que
   noviembre tiene un Regional y dos Cups.

   Los colores salen de la paleta de series de `globals.css`, que ya está
   validada para daltonismo y tiene versión clara y oscura. Ninguno escrito a
   mano: si mañana se cambia `--series-2`, el calendario cambia con él.

   El orden de la lista es el de importancia en el circuito, que es el orden
   en que salen los filtros: primero lo gordo.
   ========================================================================= */

export type CalendarKind = {
  label: string;
  /** Nombre corto, para el chip del día en el móvil. */
  short: string;
  color: string;
};

export const CALENDAR_KINDS: Record<string, CalendarKind> = {
  worlds:           { label: "Mundial",           short: "Worlds", color: "var(--brand)" },
  international:    { label: "Internacional",     short: "IC",     color: "var(--series-7)" },
  regional:         { label: "Regional",          short: "Reg",    color: "var(--series-2)" },
  special:          { label: "Special Event",     short: "SPE",    color: "var(--series-5)" },
  league_cup:       { label: "League Cup",        short: "Cup",    color: "var(--series-1)" },
  league_challenge: { label: "League Challenge",  short: "LC",     color: "var(--series-3)" },
  store:            { label: "De tienda",         short: "Tienda", color: "var(--series-4)" },
  online:           { label: "Online",            short: "Online", color: "var(--series-6)" },
  other:            { label: "Otro",              short: "Otro",   color: "var(--muted)" },
};

/** Lo que no es un torneo del circuito: jornadas, fechas límite, partidas. */
export const CALENDAR_OWN = {
  round:    { label: "Jornada",      short: "Jornada",  color: "var(--info)" },
  deadline: { label: "Fecha límite", short: "Límite",   color: "var(--loss)" },
  match:    { label: "Partida",      short: "Partida",  color: "var(--muted)" },
  event:    { label: "Evento",       short: "Evento",   color: "var(--info)" },
} as const;

/** El color de algo del calendario, mirando primero el tipo de torneo. */
export function toneOf(tournamentKind: string, fallback: keyof typeof CALENDAR_OWN = "event"): CalendarKind {
  const t = CALENDAR_KINDS[tournamentKind];
  if (t) return t;
  const own = CALENDAR_OWN[fallback];
  return { label: own.label, short: own.short, color: own.color };
}

/** Los tipos que de verdad aparecen en una lista, en el orden de arriba. */
export function kindsPresent(kinds: Array<string | null | undefined>): string[] {
  const set = new Set(kinds.filter((k): k is string => Boolean(k && CALENDAR_KINDS[k])));
  return Object.keys(CALENDAR_KINDS).filter((k) => set.has(k));
}
