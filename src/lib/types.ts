import type {
  Archetype, Competition, Deck, EventRow, Game, Invite, LadderEntry, Match, Player, Settings,
  Tournament, TournamentResult,
} from "@/db/schema";

export type {
  Archetype, Competition, Deck, EventRow, Game, Invite, LadderEntry, Match, Player, Settings,
  Tournament, TournamentResult,
};

/**
 * Un jugador tal y como puede salir de servidor.
 *
 * Es `Player` sin `email` ni `passwordHash`. Importa de verdad: Next serializa
 * todo lo que un Server Component pasa como prop a un componente cliente, así
 * que si el snapshot llevara la fila entera, cualquiera con cuenta podría leer
 * en el HTML el hash y el correo de los demás. El tipo existe para que el
 * compilador no deje que eso vuelva a colarse.
 */
export type PublicPlayer = Omit<Player, "email" | "passwordHash">;

/** Una partida con sus juegos ya cargados: lo que consume el motor de estadísticas. */
export type MatchFull = Match & { games: Game[] };

/** Un torneo con los resultados de la gente del grupo que fue. */
export type TournamentFull = Tournament & { results: TournamentResult[] };

/* ------------------------------------------------------------- torneos --- */

/**
 * El ciclo de vida de un torneo, que es lo que ordena el trabajo:
 *
 *   borrador → abierto → cerrado
 *
 * Se crea la cabecera cuando te apuntas o cuando lo anuncian (borrador), se
 * abre al empezar el evento y se van metiendo rondas, y se cierra cuando ya
 * hay puesto final. Cerrado no acepta rondas nuevas — se puede reabrir, pero
 * hay que decirlo, y esa fricción es justo la que evita tocar sin querer un
 * torneo de hace tres meses.
 */
export const TOURNAMENT_STATUS = {
  draft: {
    label: "Borrador",
    short: "Borrador",
    hint: "Apuntado, todavía sin jugar",
    chip: "chip",
  },
  open: {
    label: "En curso",
    short: "En curso",
    hint: "Se pueden apuntar rondas",
    chip: "chip-info",
  },
  closed: {
    label: "Cerrado",
    short: "Cerrado",
    hint: "Resultado final puesto",
    chip: "chip-brand",
  },
} as const;

export type TournamentStatus = keyof typeof TOURNAMENT_STATUS;

export const TOURNAMENT_STATUSES = Object.keys(TOURNAMENT_STATUS) as TournamentStatus[];

export const asStatus = (s: string): TournamentStatus =>
  (TOURNAMENT_STATUSES as string[]).includes(s) ? (s as TournamentStatus) : "open";

/* --------------------------------------------------------------- mazos --- */

/**
 * Un mazo tal y como lo ve un selector.
 *
 * Es plano y serializable a propósito: lo construye el servidor y lo consume
 * un componente cliente, así que no puede llevar dentro filas de Drizzle ni
 * mapas. `group` es lo único que decide el orden en el desplegable, y ese
 * orden es el que hace que elegir mazo desde el móvil sea un gesto y no una
 * búsqueda.
 */
export type DeckOption = {
  id: string;
  name: string;
  archetypeId: string;
  archetypeName: string;
  /** Slugs para el sprite. */
  main: string;
  secondary: string;
  type: string;
  /** fav = favorito tuyo · mine = tuyo · shared = de la liga · other = de otra persona */
  group: "fav" | "mine" | "shared" | "other";
  /** Nombre del dueño, solo cuando el mazo es de otra persona. */
  ownerName?: string;
  hasList: boolean;
};

/**
 * Marca que distingue un arquetipo suelto de un mazo registrado cuando los dos
 * viajan en la misma lista de un selector.
 *
 * Vive aquí y no en `lib/data` porque los selectores son componentes cliente y
 * `lib/data` es `server-only`: importarlo desde el navegador rompe el build.
 */
export const ARCHETYPE_PREFIX = "arch:";

/** Le pone el prefijo a un id de arquetipo, o devuelve "" si no hay. */
export const archetypeValue = (id: string | null | undefined) =>
  id ? `${ARCHETYPE_PREFIX}${id}` : "";

export const DECK_GROUP_LABEL: Record<DeckOption["group"], string> = {
  fav: "Favoritos",
  mine: "Tuyos",
  shared: "De la liga",
  other: "De otra gente",
};

export type Side = "a" | "b";

/**
 * Resultado de una serie.
 *
 * `declared` es true cuando el resultado se apuntó a mano sin desglosar los
 * juegos (registro rápido de una ronda de torneo). En ese caso `ga` y `gb` son
 * 0 porque de verdad no se sabe el marcador, y la interfaz enseña V/E/D en
 * lugar de un «0–0» que sería mentira.
 */
export type Outcome = {
  ga: number; gb: number; ties: number; winner: Side | "tie"; declared: boolean;
};

export type StandingRow = {
  playerId: string;
  played: number;
  wins: number;
  ties: number;
  losses: number;
  gameWins: number;
  gameLosses: number;
  points: number;
  winRate: number | null;
  gameWinRate: number | null;
  diff: number;
  resistance: number | null;
  streak: { kind: "w" | "l" | "d" | "-"; n: number };
  elo: number;
};

export const COMPETITION_KINDS = {
  league: { name: "Liga (todos contra todos)", short: "Liga", hint: "Round robin" },
  swiss: { name: "Torneo suizo", short: "Suizo", hint: "Rondas suizas + top cut" },
  bracket: { name: "Eliminatoria", short: "Eliminatoria", hint: "Cuadro directo" },
  casual: { name: "Amistosos", short: "Amistosos", hint: "Partidas sueltas" },
} as const;

export type CompetitionKind = keyof typeof COMPETITION_KINDS;

/* --------------------------------------------------- torneos de fuera --- */

export const TOURNAMENT_SCOPES = {
  onsite: { label: "Presencial", hint: "Tienda, sede o pabellón" },
  online: { label: "Online", hint: "PTCG Live, Limitless…" },
} as const;

export const TOURNAMENT_FORMATS = {
  standard: "Estándar",
  expanded: "Expandido",
  glc: "Gym Leader Challenge",
  limited: "Limitado",
  other: "Otro",
} as const;

export const DIVISIONS = {
  masters: "Masters",
  seniors: "Seniors",
  juniors: "Juniors",
} as const;

/**
 * Cómo se agrupan los tipos de torneo en los desplegables.
 *
 * `pokemon_challenge` y `pokemon_cup` NO salen aquí a propósito: puntúan
 * exactamente igual que `league_challenge` y `league_cup` (son alias en
 * `src/lib/cp.ts`), así que tenerlos como opciones aparte del mismo tipo de
 * evento solo era confuso. Se retiran del desplegable con la v0.5.0; los
 * torneos que ya existieran con esos tipos se migraron a su equivalente en
 * `drizzle/0003_v0_5_0.sql`. El alias se queda en `cp.ts` sin más: no hace
 * daño y es la red de seguridad si algún dato viejo se cuela.
 */
export const TOURNAMENT_KIND_GROUPS: Array<{ group: string; kinds: string[] }> = [
  { group: "Oficiales que dan CP", kinds: ["league_challenge", "league_cup", "regional", "special", "international", "worlds"] },
  { group: "Otros", kinds: ["store", "online", "other"] },
];

/** Resultado de un formulario que usa `useActionState`. */
export type FormState = { error?: string; ok?: string } | null;


/* ------------------------------------------------- estadísticas (API) --- */

/**
 * Un arquetipo con sus números, venga de donde venga.
 *
 * La misma forma para la liga y para el metagame mundial, a propósito: así la
 * pantalla los pinta con el mismo componente y compararlos es restar dos
 * campos, no reconciliar dos estructuras distintas.
 *
 * Vive aquí y no junto al endpoint porque lo consumen componentes cliente, y
 * un fichero de ruta no es sitio del que importar.
 */
export type ArchetypeRow = {
  id: string;
  name: string;
  main: string;
  secondary: string;
  type: string;
  played: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number | null;
  share: number;
};

export type StatsPayload = {
  local?: {
    archetypes: ArchetypeRow[];
    matches: number;
    players: number;
  };
  global?: {
    archetypes: ArchetypeRow[];
    tournaments: number;
    entries: number;
    days: number;
    fetchedAt: string;
    /** Torneos que no respondieron. Si es alto, la foto está coja. */
    failed: number;
    /** La API de Limitless no filtra por país; la pantalla tiene que decirlo. */
    worldwideOnly: true;
  };
  error?: string;
};
