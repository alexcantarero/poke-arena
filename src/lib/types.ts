import type { Archetype, Competition, Deck, Game, Match, Player, Settings } from "@/db/schema";

export type { Archetype, Competition, Deck, Game, Match, Player, Settings };

/** Una partida con sus juegos ya cargados: es lo que consume todo el motor de estadísticas. */
export type MatchFull = Match & { games: Game[] };

export type Side = "a" | "b";

export type Outcome = { ga: number; gb: number; ties: number; winner: Side | "tie" };

export type StandingRow = {
  playerId: string;
  played: number;
  wins: number;
  ties: number;
  losses: number;
  gameWins: number;
  gameLosses: number;
  points: number;
  /** % de victorias, con los empates contando medio. */
  winRate: number | null;
  gameWinRate: number | null;
  diff: number;
  /** Resistencia estilo Play! Pokémon (suelo del 25%). */
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
