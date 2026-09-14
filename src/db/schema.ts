import { sql } from "drizzle-orm";
import {
  pgTable, text, integer, boolean, timestamp, jsonb, date, serial, index, uniqueIndex,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------
   Esquema de la liga.

   Un espacio de trabajo (vuestra liga) con jugadores que tienen cuenta
   propia, competiciones internas, y torneos de fuera —oficiales, de tienda
   u online— con el resultado de cada uno.

   Dos ideas que conviene tener claras antes de leer:

   · `matches` es una serie completa y `games` cada juego de dentro. El
     marcador nunca se guarda: se cuenta. Por eso corregir una partida vieja
     deja todo coherente sin tocar nada más.
   · `competitions` son vuestras competiciones internas; `tournaments` son
     eventos de fuera a los que va alguien del grupo. Son cosas distintas y
     por eso son tablas distintas.
   ------------------------------------------------------------------------- */

/* ------------------------------------------------------------- la liga --- */

/** Configuración global. Una única fila, con id = "default". */
export const settings = pgTable("settings", {
  id: text("id").primaryKey().default("default"),
  name: text("name").notNull().default("Liga Arena"),
  season: text("season").notNull().default("Temporada 1"),
  /** Temporada de Play! Pokémon en curso, para los CP: 2027, 2028… */
  cpSeason: integer("cp_season").notNull().default(2027),
  ptsWin: integer("pts_win").notNull().default(3),
  ptsTie: integer("pts_tie").notNull().default(1),
  ptsLoss: integer("pts_loss").notNull().default(0),
  eloStart: integer("elo_start").notNull().default(1000),
  eloK: integer("elo_k").notNull().default(24),
  /** Zona de clasificación, para el panel de ruta al Mundial. */
  ratingZone: text("rating_zone").notNull().default("europe"),
  /** Si está abierta, cualquiera con el enlace de invitación puede darse de alta. */
  registrationOpen: boolean("registration_open").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------------------------------------------------------- jugadores --- */

/**
 * Un jugador ES una cuenta. No hay tabla de usuarios aparte porque la app
 * sirve a una sola liga; el día que sirva a varias, esta tabla se parte en
 * `users` + `league_members` y el resto del esquema no se entera.
 */
export const players = pgTable("players", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),

  /* --- credenciales --- */
  /** En minúsculas y sin espacios. Único. Nulo solo en jugadores heredados. */
  email: text("email"),
  /** scrypt: "salt:hash" en hexadecimal. Nunca la contraseña en claro. */
  passwordHash: text("password_hash"),

  /* --- papel dentro de la liga --- */
  /** owner · admin · player */
  role: text("role").notNull().default("player"),
  active: boolean("active").notNull().default(true),

  /* --- perfil --- */
  color: text("color").notNull().default("#f0b429"),
  /** none · pokemon · image */
  avatarKind: text("avatar_kind").notNull().default("none"),
  /** Slug del Pokémon, o URL de la imagen, según avatarKind. */
  avatarValue: text("avatar_value").notNull().default(""),
  bio: text("bio").notNull().default(""),
  favoriteArchetypeId: text("favorite_archetype_id"),
  /** Nombre de jugador en Play! Pokémon, para casar resultados oficiales. */
  playerTag: text("player_tag"),

  /* --- ladder manual ---
     El rango que cada uno se pone a mano para picarse, de 1500 (Bronce) a
     2000 (Challenger). NO es el Elo de la liga: ese lo calcula stats.ts desde
     las partidas y no se puede tocar. Son dos números distintos a propósito. */
  ladderElo: integer("ladder_elo"),
  ladderEloUpdatedAt: timestamp("ladder_elo_updated_at", { withTimezone: true }),
  ladderNote: text("ladder_note").notNull().default(""),

  joined: date("joined").notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("players_email_idx").on(t.email)]);

/**
 * Invitaciones. El token es la parte secreta del enlace
 * `/registro/<token>`; se genera aleatorio y no se puede adivinar.
 */
export const invites = pgTable("invites", {
  token: text("token").primaryKey(),
  /** Etiqueta libre para acordarse de a quién se le mandó. */
  label: text("label").notNull().default(""),
  /** Papel con el que entra quien la use. */
  role: text("role").notNull().default("player"),
  /** 0 = sin límite. */
  maxUses: integer("max_uses").notNull().default(1),
  uses: integer("uses").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revoked: boolean("revoked").notNull().default(false),
  createdBy: text("created_by").references(() => players.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* --------------------------------------------------------- arquetipos --- */

/** Arquetipo = Pokémon principal (+ secundario). Es la unidad de las estadísticas. */
export const archetypes = pgTable("archetypes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  /** Slug del Pokémon principal, tal como lo nombra Limitless: "raging-bolt". */
  main: text("main").notNull().default(""),
  secondary: text("secondary").notNull().default(""),
  /** Tipo de energía, solo para colorear: grass, fire, water… */
  type: text("type").notNull().default("colorless"),
  limitlessId: text("limitless_id"),
});

/**
 * Un mazo. Puede ser de alguien o de la liga entera.
 *
 * `playerId` nulo = mazo de la biblioteca compartida: no es de nadie, lo ve y
 * lo puede elegir cualquiera, y sirve tanto para decir «yo jugué esto» como
 * para decir «mi rival llevaba esto». Era el punto de la lista de Alex: «crear
 * mazos sin tener que asignarse a mi perfil… y sobre todo poner que lo usan
 * los rivales».
 *
 * Los mazos que ya existían conservan su dueño, así que nada cambia de sitio.
 * Para tener los tuyos a mano sin apropiártelos está `deck_favorites`.
 */
export const decks = pgTable("decks", {
  id: text("id").primaryKey(),
  /** Nulo = de la biblioteca compartida. */
  playerId: text("player_id").references(() => players.id, { onDelete: "cascade" }),
  archetypeId: text("archetype_id").notNull().references(() => archetypes.id),
  name: text("name").notNull(),
  list: text("list").notNull().default(""),
  /** La lista ya interpretada: { total, pokemon[], trainer[], energy[] }. */
  listJson: jsonb("list_json"),
  format: text("format").notNull().default("standard"),
  retired: boolean("retired").notNull().default(false),
  created: date("created").notNull(),
  /** Quién lo metió. En un mazo compartido es lo único que dice de dónde salió. */
  createdBy: text("created_by").references(() => players.id, { onDelete: "set null" }),
}, (t) => [index("decks_player_idx").on(t.playerId)]);

/**
 * Mazos marcados como favoritos por alguien.
 *
 * Es la lista corta que sale primero en los selectores. Un favorito no implica
 * propiedad: puedes marcar un mazo compartido sin que deje de ser de todos.
 */
export const deckFavorites = pgTable("deck_favorites", {
  playerId: text("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  deckId: text("deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("deck_fav_unique_idx").on(t.playerId, t.deckId),
  index("deck_fav_player_idx").on(t.playerId),
]);

/* --------------------------------------------- competiciones internas --- */

export const competitions = pgTable("competitions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  /** league · swiss · bracket · casual */
  kind: text("kind").notNull().default("league"),
  bestOf: integer("best_of").notNull().default(3),
  /** live · done */
  status: text("status").notNull().default("live"),
  start: date("start").notNull(),
  end: date("end"),
  rounds: integer("rounds").notNull().default(0),
  topCut: integer("top_cut").notNull().default(0),
});

export const competitionPlayers = pgTable("competition_players", {
  competitionId: text("competition_id").notNull().references(() => competitions.id, { onDelete: "cascade" }),
  playerId: text("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  seed: integer("seed").notNull().default(0),
  dropped: boolean("dropped").notNull().default(false),
}, (t) => [index("cp_comp_idx").on(t.competitionId)]);

/* ------------------------------------------------------------ partidas --- */

/** Un enfrentamiento: la serie completa (Bo1, Bo3 o Bo5). */
export const matches = pgTable("matches", {
  id: text("id").primaryKey(),
  competitionId: text("competition_id").references(() => competitions.id, { onDelete: "set null" }),
  /** Si la partida se jugó dentro de un torneo de fuera, queda enlazada aquí. */
  tournamentId: text("tournament_id").references(() => tournaments.id, { onDelete: "set null" }),
  round: integer("round").notNull().default(0),
  date: date("date").notNull(),
  playerAId: text("player_a_id").notNull().references(() => players.id),
  /** Nulo cuando el rival es de fuera de la liga; entonces se usa opponentName. */
  playerBId: text("player_b_id").references(() => players.id),
  /** Rival externo: solo su nombre y su mazo, para las estadísticas de metagame. */
  opponentName: text("opponent_name"),
  deckAId: text("deck_a_id").references(() => decks.id, { onDelete: "set null" }),
  deckBId: text("deck_b_id").references(() => decks.id, { onDelete: "set null" }),
  /** Arquetipo del rival externo, que no tiene mazo registrado en la app. */
  opponentArchetypeId: text("opponent_archetype_id").references(() => archetypes.id, { onDelete: "set null" }),
  bestOf: integer("best_of").notNull().default(3),
  /** scheduled · done */
  status: text("status").notNull().default("done"),
  /**
   * Resultado de la serie declarado a mano: "a" · "b" · "tie" · null.
   *
   * Existe para el registro rápido de rondas de torneo, donde a veces solo se
   * sabe "esta ronda la gané" y no el desglose juego a juego. Si hay filas en
   * `games`, manda el desglose y esta columna se ignora: el marcador se sigue
   * contando, nunca se guarda.
   *
   * Y resuelve una ambigüedad que si no es irresoluble: un 1-1 esperando el
   * tercer juego y un 1-1 con el tiempo agotado tienen los mismos juegos
   * apuntados, pero uno es una ronda a medias y el otro un empate.
   */
  seriesResult: text("series_result"),
  /**
   * Quién salió primero en el primer juego: "a" · "b" · "".
   *
   * En una ronda de suizo el orden del primer juego lo decide la moneda y es
   * el dato que se recuerda ("salí primero y perdí igual"); del segundo y el
   * tercero ya lo decide el resultado anterior. Vive aquí y no solo en
   * `games.first` porque el registro rápido de una ronda apunta el resultado
   * de la serie sin desglosar juegos, y entonces no hay ninguna fila de
   * `games` donde meterlo.
   *
   * Si hay juegos, `games[0].first` es la fuente buena y esto es una copia.
   */
  firstTurn: text("first_turn").notNull().default(""),
  note: text("note").notNull().default(""),
  createdBy: text("created_by").references(() => players.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("matches_comp_idx").on(t.competitionId),
  index("matches_tour_idx").on(t.tournamentId),
  index("matches_a_idx").on(t.playerAId),
  index("matches_b_idx").on(t.playerBId),
  index("matches_date_idx").on(t.date),
  // Una ronda de un torneo es única por jugador: evita duplicar la ronda 3 de
  // un doble toque en el móvil. Parcial, porque las partidas de liga no llevan
  // torneo y comparten `round` sin problema.
  uniqueIndex("matches_tour_round_idx")
    .on(t.tournamentId, t.playerAId, t.round)
    .where(sql`${t.tournamentId} is not null`),
]);

/** Cada juego individual dentro de la serie. Aquí vive el detalle fino. */
export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  matchId: text("match_id").notNull().references(() => matches.id, { onDelete: "cascade" }),
  number: integer("number").notNull(),
  /** "a" · "b" · "tie" */
  winner: text("winner").notNull(),
  /** "a" · "b" · "" — quién empezó. Alimenta la ventaja del primer turno. */
  first: text("first").notNull().default(""),
  /** Premios que le quedaban al perdedor (0-6). */
  prizesLeft: integer("prizes_left"),
  turns: integer("turns"),
  note: text("note").notNull().default(""),
}, (t) => [index("games_match_idx").on(t.matchId)]);

/* ------------------------------------------------- torneos de fuera --- */

/**
 * Un torneo al que va alguien del grupo: oficial, de tienda u online.
 * Es solo la cabecera del evento; lo que hizo cada uno va en
 * `tournamentResults`, así que varios podéis compartir el mismo torneo.
 */
export const tournaments = pgTable("tournaments", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  /**
   * league_challenge · league_cup · pokemon_challenge · pokemon_cup ·
   * regional · special · international · worlds · store · online · other
   *
   * Los tipos que dan Championship Points y su equivalencia están en
   * src/data/cp-<temporada>.json, no aquí.
   */
  kind: text("kind").notNull().default("store"),
  /**
   * En qué punto del ciclo está: `draft` · `open` · `closed`.
   *
   * Es lo que ordena el trabajo. Se crea la cabecera (borrador), se abre
   * cuando empieza el evento y se van apuntando rondas, y se cierra cuando ya
   * está el puesto final. Un torneo cerrado no acepta rondas nuevas: es la
   * diferencia entre «esto todavía se mueve» y «esto ya es historia», y sin
   * ella no se sabe si un torneo sin puesto es que acabó mal o que falta
   * rellenarlo.
   *
   * `open` por defecto para que los torneos que ya existían sigan
   * comportándose igual que antes.
   */
  status: text("status").notNull().default("open"),
  /** Cuándo se cerró, para poder decir «cerrado el 3 de marzo». */
  closedAt: timestamp("closed_at", { withTimezone: true }),
  /** onsite · online */
  scope: text("scope").notNull().default("onsite"),
  /** standard · expanded · glc · limited · other */
  format: text("format").notNull().default("standard"),
  /** Formato de serie del torneo: 1, 3 o 5. */
  bestOf: integer("best_of").notNull().default(3),
  date: date("date").notNull(),
  endDate: date("end_date"),
  /** Tienda, sede o plataforma online. */
  venue: text("venue").notNull().default(""),
  city: text("city").notNull().default(""),
  country: text("country").notNull().default(""),
  organizer: text("organizer").notNull().default(""),
  /** Enlace al torneo en RK9, Limitless o donde esté. */
  url: text("url").notNull().default(""),
  /** Cuánta gente hubo. Determina qué tramos de CP se reparten. */
  playerCount: integer("player_count"),
  rounds: integer("rounds"),
  topCut: integer("top_cut"),
  /** Temporada de Play! Pokémon a la que cuenta. */
  season: integer("season"),
  division: text("division").notNull().default("masters"),
  notes: text("notes").notNull().default(""),
  createdBy: text("created_by").references(() => players.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("tournaments_date_idx").on(t.date),
  index("tournaments_kind_idx").on(t.kind),
  index("tournaments_season_idx").on(t.season),
]);

/** Lo que hizo un jugador del grupo en un torneo. */
export const tournamentResults = pgTable("tournament_results", {
  id: text("id").primaryKey(),
  tournamentId: text("tournament_id").notNull().references(() => tournaments.id, { onDelete: "cascade" }),
  playerId: text("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  /** Puesto final. Nulo si se retiró antes de que hubiera clasificación. */
  placement: integer("placement"),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  ties: integer("ties").notNull().default(0),
  /** Mazo registrado en la app, si lo hay. */
  deckId: text("deck_id").references(() => decks.id, { onDelete: "set null" }),
  /** Arquetipo, por si jugó algo que no tiene registrado como mazo. */
  archetypeId: text("archetype_id").references(() => archetypes.id, { onDelete: "set null" }),
  /**
   * Championship Points ganados. Se puede teclear a mano, o dejar que lo
   * calcule la app a partir del tipo de torneo y el puesto.
   */
  cpEarned: integer("cp_earned").notNull().default(0),
  /** true si el número lo puso una persona y no debe recalcularse. */
  cpManual: boolean("cp_manual").notNull().default(false),
  /** Premios, en texto libre: "3 sobres y un playmat". */
  prizes: text("prizes").notNull().default(""),
  notes: text("notes").notNull().default(""),
  dropped: boolean("dropped").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("tr_unique_idx").on(t.tournamentId, t.playerId),
  index("tr_player_idx").on(t.playerId),
]);

/* ------------------------------------------------------- ladder manual --- */

/**
 * Cada cambio de rango deja una fila aquí. `players.ladderElo` es el valor
 * actual; esto es el historial, y es lo que permite pintar la evolución.
 */
export const ladderEntries = pgTable("ladder_entries", {
  id: text("id").primaryKey(),
  playerId: text("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  elo: integer("elo").notNull(),
  note: text("note").notNull().default(""),
  /** Quién lo apuntó: uno mismo, o un organizador corrigiendo. */
  createdBy: text("created_by").references(() => players.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("ladder_player_idx").on(t.playerId)]);

/* ------------------------------------------------------------ eventos --- */

/** Calendario: jornadas, torneos previstos, fechas límite. */
export const events = pgTable("events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  date: date("date").notNull(),
  /** round · tourney · deadline · other */
  kind: text("kind").notNull().default("round"),
  competitionId: text("competition_id").references(() => competitions.id, { onDelete: "set null" }),
  tournamentId: text("tournament_id").references(() => tournaments.id, { onDelete: "set null" }),
  note: text("note").notNull().default(""),
});

/* ------------------------------------------------------------- tipos --- */

export type Player = typeof players.$inferSelect;
export type Invite = typeof invites.$inferSelect;
export type Archetype = typeof archetypes.$inferSelect;
export type Deck = typeof decks.$inferSelect;
export type DeckFavorite = typeof deckFavorites.$inferSelect;
export type Competition = typeof competitions.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Game = typeof games.$inferSelect;
export type Tournament = typeof tournaments.$inferSelect;
export type TournamentResult = typeof tournamentResults.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type LadderEntry = typeof ladderEntries.$inferSelect;
export type Settings = typeof settings.$inferSelect;
