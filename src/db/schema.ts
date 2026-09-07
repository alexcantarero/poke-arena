import {
  pgTable, text, integer, boolean, timestamp, jsonb, date, serial, index,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------
   Esquema de la liga.
   Un solo espacio de trabajo (vuestra liga) con varias competiciones dentro.
   Está pensado para crecer: si algún día quieres varias ligas independientes,
   basta con añadir una tabla `leagues` y una columna `leagueId` a las demás.
   ------------------------------------------------------------------------- */

/** Configuración global. Una única fila con id = "default". */
export const settings = pgTable("settings", {
  id: text("id").primaryKey().default("default"),
  name: text("name").notNull().default("Liga Arena"),
  season: text("season").notNull().default("Temporada 1"),
  ptsWin: integer("pts_win").notNull().default(3),
  ptsTie: integer("pts_tie").notNull().default(1),
  ptsLoss: integer("pts_loss").notNull().default(0),
  eloStart: integer("elo_start").notNull().default(1000),
  eloK: integer("elo_k").notNull().default(24),
  inviteCode: text("invite_code").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const players = pgTable("players", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#f0b429"),
  isAdmin: boolean("is_admin").notNull().default(false),
  active: boolean("active").notNull().default(true),
  /** PIN personal opcional: si está puesto, hay que teclearlo para actuar como ese jugador. */
  pin: text("pin"),
  joined: date("joined").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Arquetipo = Pokémon principal (+ secundario). Es la unidad de las estadísticas. */
export const archetypes = pgTable("archetypes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  /** Slug del Pokémon principal, en minúsculas y con guiones: "raging-bolt". */
  main: text("main").notNull().default(""),
  secondary: text("secondary").notNull().default(""),
  /** Tipo de energía, solo para colorear: grass, fire, water, ... */
  type: text("type").notNull().default("colorless"),
  /** Identificador equivalente en Limitless, si se ha sincronizado. */
  limitlessId: text("limitless_id"),
});

/** Un mazo concreto de un jugador. Puede llevar la lista completa de 60 cartas. */
export const decks = pgTable("decks", {
  id: text("id").primaryKey(),
  playerId: text("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  archetypeId: text("archetype_id").notNull().references(() => archetypes.id),
  name: text("name").notNull(),
  /** Texto tal cual se pegó desde PTCG Live / Limitless. */
  list: text("list").notNull().default(""),
  /** Lista ya interpretada: { total, pokemon[], trainer[], energy[] }. */
  listJson: jsonb("list_json"),
  format: text("format").notNull().default("standard"),
  created: date("created").notNull(),
}, (t) => [index("decks_player_idx").on(t.playerId)]);

export const competitions = pgTable("competitions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  /** league | swiss | bracket | casual */
  kind: text("kind").notNull().default("league"),
  bestOf: integer("best_of").notNull().default(3),
  /** live | done */
  status: text("status").notNull().default("live"),
  start: date("start").notNull(),
  end: date("end"),
  /** Número de rondas previstas (0 = abierto). */
  rounds: integer("rounds").notNull().default(0),
  /** Tamaño del top cut para los suizos (0 = sin top cut). */
  topCut: integer("top_cut").notNull().default(0),
});

export const competitionPlayers = pgTable("competition_players", {
  competitionId: text("competition_id").notNull().references(() => competitions.id, { onDelete: "cascade" }),
  playerId: text("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  seed: integer("seed").notNull().default(0),
  dropped: boolean("dropped").notNull().default(false),
}, (t) => [index("cp_comp_idx").on(t.competitionId)]);

/** Un enfrentamiento: la serie completa (Bo1, Bo3 o Bo5). */
export const matches = pgTable("matches", {
  id: text("id").primaryKey(),
  competitionId: text("competition_id").references(() => competitions.id, { onDelete: "set null" }),
  round: integer("round").notNull().default(0),
  date: date("date").notNull(),
  playerAId: text("player_a_id").notNull().references(() => players.id),
  playerBId: text("player_b_id").notNull().references(() => players.id),
  deckAId: text("deck_a_id").references(() => decks.id, { onDelete: "set null" }),
  deckBId: text("deck_b_id").references(() => decks.id, { onDelete: "set null" }),
  bestOf: integer("best_of").notNull().default(3),
  /** scheduled | done */
  status: text("status").notNull().default("done"),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("matches_comp_idx").on(t.competitionId),
  index("matches_a_idx").on(t.playerAId),
  index("matches_b_idx").on(t.playerBId),
  index("matches_date_idx").on(t.date),
]);

/** Cada juego individual dentro de la serie. Aquí vive el detalle fino. */
export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  matchId: text("match_id").notNull().references(() => matches.id, { onDelete: "cascade" }),
  number: integer("number").notNull(),
  /** "a" | "b" | "tie" */
  winner: text("winner").notNull(),
  /** "a" | "b" | "" — quién empezó. Alimenta la ventaja del primer turno. */
  first: text("first").notNull().default(""),
  /** Premios que le quedaban al perdedor (0-6). Opcional. */
  prizesLeft: integer("prizes_left"),
  turns: integer("turns"),
  note: text("note").notNull().default(""),
}, (t) => [index("games_match_idx").on(t.matchId)]);

/** Calendario: jornadas, torneos, fechas límite. */
export const events = pgTable("events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  date: date("date").notNull(),
  /** round | tourney | deadline | other */
  kind: text("kind").notNull().default("round"),
  competitionId: text("competition_id").references(() => competitions.id, { onDelete: "set null" }),
  note: text("note").notNull().default(""),
});

export type Player = typeof players.$inferSelect;
export type Archetype = typeof archetypes.$inferSelect;
export type Deck = typeof decks.$inferSelect;
export type Competition = typeof competitions.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Game = typeof games.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type Settings = typeof settings.$inferSelect;
