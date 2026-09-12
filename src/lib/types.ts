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

/** Cómo se agrupan los tipos de torneo en los desplegables. */
export const TOURNAMENT_KIND_GROUPS: Array<{ group: string; kinds: string[] }> = [
  { group: "Oficiales que dan CP", kinds: ["league_challenge", "league_cup", "pokemon_challenge", "pokemon_cup", "regional", "special", "international", "worlds"] },
  { group: "Otros", kinds: ["store", "online", "other"] },
];

/** Resultado de un formulario que usa `useActionState`. */
export type FormState = { error?: string; ok?: string } | null;
