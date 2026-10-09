/* =========================================================================
   Los filtros, en un solo sitio.

   Resultados y Estadísticas filtraban cada uno por su cuenta y con criterios
   distintos: Resultados sabía filtrar por competición pero no por torneo, y
   en Estadísticas los de fecha y tipo estaban puestos pero no filtraban la
   data que se pintaba. Con dos implementaciones, arreglar una no arreglaba la
   otra.

   Así que las reglas viven aquí, son funciones puras, y las dos pantallas
   —y el endpoint de la API— llaman a las mismas.

   Tres decisiones que conviene no deshacer:

   · **El filtro viaja en la URL.** Se puede compartir el enlace, la vuelta
     atrás del navegador hace lo que se espera, y funciona sin JavaScript.
   · **Las fechas son cadenas ISO y se comparan como cadenas.** `matches.date`
     es una columna `date`, o sea "AAAA-MM-DD", y ese formato ordena igual
     como texto que como fecha. Convertir a Date para comparar sería más
     lento y abriría la puerta a los líos de zona horaria de siempre.
   · **Nada de esto toca la base de datos.** El snapshot ya está en memoria;
     filtrar es recorrer un array. El día que la liga tenga cien mil partidas,
     esto pasa a ser un WHERE, y estas funciones marcan exactamente qué hay
     que traducir.
   ========================================================================= */

import type { MatchFull } from "./types";

/** De dónde salen las partidas que se miran. */
export const MATCH_SCOPES = {
  all: "Todo",
  league: "Liga",
  tournament: "Torneos",
  /* `onsite` y `online` parten los torneos por dónde se juegan, que es la
     distinción que de verdad se pide en el ranking: un torneo presencial y
     uno online no se comparan igual. La columna es `tournaments.scope`. */
  onsite: "Presenciales",
  online: "Online",
  casual: "Amistosos",
} as const;

export type MatchScope = keyof typeof MATCH_SCOPES;

/** Atajos de fecha, que es como de verdad piensa la gente. */
export const DATE_PRESETS = {
  all: { label: "Siempre", days: null },
  "30d": { label: "30 días", days: 30 },
  "90d": { label: "90 días", days: 90 },
  "365d": { label: "1 año", days: 365 },
} as const;

export type DatePreset = keyof typeof DATE_PRESETS;

export type MatchFilter = {
  scope: MatchScope;
  /** Atajo elegido. "custom" cuando hay fechas escritas a mano. */
  preset: DatePreset | "custom";
  /** ISO "AAAA-MM-DD", o "" si no hay. */
  from: string;
  to: string;
  /** Tipo de torneo: "league_cup", "regional"… "" = todos. */
  tournamentKind: string;
  /** Tipo de competición interna: "league", "swiss"… "" = todas. */
  competitionKind: string;
  /** Un torneo concreto. "" = todos. */
  tournamentId: string;
  /** Una competición concreta. "" = todas. */
  competitionId: string;
  /** Un arquetipo concreto. "" = todos. */
  archetypeId: string;
  /** Una persona concreta. "" = toda la liga. */
  playerId: string;
  format: string;
  round: number | null;
};

export const EMPTY_FILTER: MatchFilter = {
  scope: "all", preset: "all", from: "", to: "",
  tournamentKind: "", competitionKind: "", tournamentId: "", competitionId: "",
  archetypeId: "", playerId: "", format: "", round: null,
};

const isISO = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

/** Resta días a hoy y devuelve la fecha ISO. */
function daysAgo(days: number, today = new Date()): string {
  const d = new Date(today.getTime() - days * 86400000);
  return d.toISOString().slice(0, 10);
}

/**
 * Lee el filtro de los parámetros de la URL.
 *
 * Todo lo que no se reconoce cae al valor neutro: un parámetro inventado no
 * puede dejar la pantalla en blanco ni reventar nada.
 */
export function parseMatchFilter(
  sp: Record<string, string | string[] | undefined>,
  today = new Date(),
): MatchFilter {
  const one = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };

  const scope = (Object.keys(MATCH_SCOPES) as MatchScope[]).includes(one("ambito") as MatchScope)
    ? (one("ambito") as MatchScope)
    : "all";

  const rawFrom = one("desde");
  const rawTo = one("hasta");
  const rawPreset = one("cuando");

  // Las fechas escritas a mano mandan sobre el atajo: si alguien ha tecleado
  // un rango, es que quiere ese rango.
  let preset: DatePreset | "custom";
  let from = "";
  let to = "";
  if (isISO(rawFrom) || isISO(rawTo)) {
    preset = "custom";
    from = isISO(rawFrom) ? rawFrom : "";
    to = isISO(rawTo) ? rawTo : "";
  } else if ((Object.keys(DATE_PRESETS) as DatePreset[]).includes(rawPreset as DatePreset)) {
    preset = rawPreset as DatePreset;
    const days = DATE_PRESETS[preset].days;
    from = days == null ? "" : daysAgo(days, today);
  } else {
    preset = "all";
  }

  return {
    scope,
    preset,
    from,
    to,
    tournamentKind: one("tipoTorneo").slice(0, 40),
    competitionKind: one("tipoComp").slice(0, 40),
    tournamentId: one("torneo").slice(0, 60),
    competitionId: one("comp").slice(0, 60),
    archetypeId: one("arquetipo").slice(0, 60),
    playerId: one("jugador").slice(0, 60),
    format: one("formato").slice(0, 40),
    round: one("jornada") ? parseInt(one("jornada"), 10) : null,
  };
}

/** El filtro de vuelta a parámetros, para construir enlaces. */
export function filterToQuery(f: MatchFilter): URLSearchParams {
  const p = new URLSearchParams();
  if (f.scope !== "all") p.set("ambito", f.scope);
  if (f.preset === "custom") {
    if (f.from) p.set("desde", f.from);
    if (f.to) p.set("hasta", f.to);
  } else if (f.preset !== "all") {
    p.set("cuando", f.preset);
  }
  if (f.tournamentKind) p.set("tipoTorneo", f.tournamentKind);
  if (f.competitionKind) p.set("tipoComp", f.competitionKind);
  if (f.tournamentId) p.set("torneo", f.tournamentId);
  if (f.competitionId) p.set("comp", f.competitionId);
  if (f.archetypeId) p.set("arquetipo", f.archetypeId);
  if (f.playerId) p.set("jugador", f.playerId);
  if (f.format) p.set("formato", f.format);
  if (f.round != null && !isNaN(f.round)) p.set("jornada", f.round.toString());
  return p;
}

/** ¿Hay algo puesto? Para poder enseñar un «quitar filtros» solo cuando hace falta. */
export const isFiltered = (f: MatchFilter) => filterToQuery(f).toString().length > 0;

/**
 * Cuántos filtros hay puestos. Sirve para la pastilla con el número que se
 * enseña en el móvil, donde el panel va plegado y no se ve qué hay activo.
 */
export function countFilters(f: MatchFilter): number {
  let n = 0;
  if (f.scope !== "all") n++;
  if (f.preset !== "all") n++;
  for (const k of ["tournamentKind", "competitionKind", "tournamentId", "competitionId", "archetypeId", "playerId", "format"] as const) {
    if (f[k]) n++;
  }
  return n;
}

/** Lo que hace falta saber de cada partida para decidir si pasa el filtro. */
export type FilterIndex = {
  /** Tipo de cada torneo, por id. */
  tournamentKind: Map<string, string>;
  /** Formato de cada torneo, por id. */
  tournamentFormat: Map<string, string>;
  /** Dónde se juega cada torneo —`onsite` u `online`—, por id. */
  tournamentScope: Map<string, string>;
  /** Tipo de cada competición, por id. */
  competitionKind: Map<string, string>;
  /** Los dos arquetipos de cada partida, por id de partida. */
  archetypesOf: (m: MatchFull) => Array<string | undefined>;
};

/**
 * Aplica el filtro.
 *
 * El orden de las comprobaciones va de la más barata y la que más descarta a
 * la más cara: primero el ámbito y la fecha, que son comparaciones sueltas,
 * y solo al final los arquetipos, que necesitan resolver el mazo de cada lado.
 */
export function applyMatchFilter(
  matches: MatchFull[],
  f: MatchFilter,
  index: FilterIndex,
): MatchFull[] {
  return matches.filter((m) => {
    /* ámbito */
    if (f.scope === "league" && !m.competitionId) return false;
    if (f.scope === "tournament" && !m.tournamentId) return false;
    if (f.scope === "casual" && (m.competitionId || m.tournamentId)) return false;
    if (f.scope === "onsite" || f.scope === "online") {
      if (!m.tournamentId) return false;
      // Un torneo sin `scope` guardado es presencial: es el valor por
      // defecto de la columna y lo que eran todos antes de que existiera.
      const donde = index.tournamentScope.get(m.tournamentId) || "onsite";
      if (donde !== f.scope) return false;
    }

    /* fecha — comparación de cadenas, ver la cabecera */
    if (f.from && m.date < f.from) return false;
    if (f.to && m.date > f.to) return false;

    /* de qué torneo o competición */
    if (f.tournamentId && m.tournamentId !== f.tournamentId) return false;
    if (f.competitionId && m.competitionId !== f.competitionId) return false;
    if (f.round && m.round !== f.round) return false;

    /* tipo de torneo / de competición */
    if (f.tournamentKind) {
      if (!m.tournamentId) return false;
      if (index.tournamentKind.get(m.tournamentId) !== f.tournamentKind) return false;
    }
    if (f.competitionKind) {
      if (!m.competitionId) return false;
      if (index.competitionKind.get(m.competitionId) !== f.competitionKind) return false;
    }

    /* formato: solo lo saben los torneos; una partida de liga no tiene */
    if (f.format) {
      if (!m.tournamentId) return false;
      if (index.tournamentFormat.get(m.tournamentId) !== f.format) return false;
    }

    /* quién jugó */
    // v0.15.1: también cuando la persona fue el rival de una ronda de torneo.
    if (f.playerId && m.playerAId !== f.playerId && m.playerBId !== f.playerId
      && m.opponentPlayerId !== f.playerId) return false;

    /* con qué se jugó, en cualquiera de los dos lados */
    if (f.archetypeId && !index.archetypesOf(m).includes(f.archetypeId)) return false;

    return true;
  });
}

/** Cómo describir el filtro en una línea, para la cabecera de la pantalla. */
export function describeFilter(f: MatchFilter, names: {
  tournament?: (id: string) => string | undefined;
  competition?: (id: string) => string | undefined;
  archetype?: (id: string) => string | undefined;
  player?: (id: string) => string | undefined;
  kind?: (k: string) => string | undefined;
} = {}): string {
  const partes: string[] = [];
  if (f.scope !== "all") partes.push(MATCH_SCOPES[f.scope]);
  if (f.preset === "custom") {
    if (f.from && f.to) partes.push(`del ${f.from} al ${f.to}`);
    else if (f.from) partes.push(`desde ${f.from}`);
    else if (f.to) partes.push(`hasta ${f.to}`);
  } else if (f.preset !== "all") {
    partes.push(`últimos ${DATE_PRESETS[f.preset].label.toLowerCase()}`);
  }
  if (f.tournamentId) partes.push(names.tournament?.(f.tournamentId) ?? "un torneo");
  if (f.competitionId) partes.push(names.competition?.(f.competitionId) ?? "una competición");
  if (f.tournamentKind) partes.push(names.kind?.(f.tournamentKind) ?? f.tournamentKind);
  if (f.archetypeId) partes.push(names.archetype?.(f.archetypeId) ?? "un arquetipo");
  if (f.playerId) partes.push(names.player?.(f.playerId) ?? "una persona");
  return partes.join(" · ");
}
