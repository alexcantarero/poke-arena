import { sql } from "drizzle-orm";
import {
  pgTable, text, integer, boolean, timestamp, jsonb, date, serial, index, uniqueIndex,
  type AnyPgColumn,
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
  /**
   * Qué partidas mueven el Elo: `all` · `competitive` · `tournaments`.
   *
   * La petición era «que los amistosos no cuenten». En la app hay tres clases
   * de partida —competición interna, torneo de fuera y suelta— así que la
   * lectura literal («solo torneos») dejaría el ranking casi vacío en una liga
   * que juega sobre todo sus propias jornadas. Por eso el valor por defecto es
   * `competitive`: cuenta liga y torneos, y deja fuera los amistosos, que es
   * lo que se pedía. `tournaments` existe para quien quiera la versión
   * estricta.
   */
  eloScope: text("elo_scope").notNull().default("competitive"),
  /**
   * Fecha de corte del Elo: las partidas anteriores no cuentan.
   *
   * Es la forma de «resetear» el Elo sin borrar nada. El Elo no está
   * guardado en ninguna parte —se recalcula desde las partidas en cada
   * carga—, así que no hay un número que poner a cero: lo que se hace es
   * decirle desde cuándo mirar. Todos vuelven al Elo inicial y a partir de
   * ahí se construye de nuevo.
   *
   * Nula por defecto, que quiere decir «desde el principio». Y reversible:
   * se quita la fecha y vuelve todo, porque las partidas siguen ahí.
   */
  eloSince: date("elo_since"),
  /**
   * v0.18 — Inicio de la temporada del ladder: el último «reset global».
   * El historial anterior no se borra; la gráfica del líder empieza aquí.
   */
  ladderSince: timestamp("ladder_since", { withTimezone: true }),
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

  /* --- v0.17: puesto en la clasificación oficial de CP ---
     Lo pone cada uno a mano (o un organizador): Play! Pokémon no publica el
     ranking por API y pokemon.com prohíbe extraerlo. Nulo = sin apuntar. */
  rankSpain: integer("rank_spain"),
  rankEurope: integer("rank_europe"),
  rankZoneUpdatedAt: timestamp("rank_zone_updated_at", { withTimezone: true }),

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
  /**
   * v0.21 — Arquetipo principal del que este es una variante («Slowking /
   * Drapion» → «Slowking»). Nulo = es principal. Ver `lib/arquetipos.ts`.
   */
  parentId: text("parent_id").references((): AnyPgColumn => archetypes.id, { onDelete: "set null" }),
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

/**
 * v0.17 — Jugadores que alguien sigue («favoritos»).
 *
 * Pensado para cuando la liga crezca: cada uno marca a quien quiere ver y el
 * Ranking se puede recortar a esa lista. Es de quien marca: nadie más ve a
 * quién sigues.
 */
export const playerFavorites = pgTable("player_favorites", {
  playerId: text("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  favoriteId: text("favorite_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("player_fav_unique_idx").on(t.playerId, t.favoriteId),
  index("player_fav_player_idx").on(t.playerId),
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
  /** v0.23 — mazo_fijo · tres_mazos · equipos. Ver `lib/modalidades.ts`. */
  modality: text("modality").notNull().default("mazo_fijo"),
});

/**
 * v0.23 — Equipos de una liga «Duelo por equipos». `members` en orden: el
 * puesto 1 juega contra el puesto 1 del otro equipo, y así. Tabla aparte
 * (no columna en `competition_players`) porque `saveCompetition` borra y
 * rehace esas filas en cada edición.
 */
export const competitionTeams = pgTable("competition_teams", {
  id: text("id").primaryKey(),
  competitionId: text("competition_id").notNull().references(() => competitions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  members: jsonb("members").$type<string[]>().notNull().default([]),
}, (t) => [index("competition_teams_comp_idx").on(t.competitionId)]);

export const competitionPlayers = pgTable("competition_players", {
  competitionId: text("competition_id").notNull().references(() => competitions.id, { onDelete: "cascade" }),
  playerId: text("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  seed: integer("seed").notNull().default(0),
  dropped: boolean("dropped").notNull().default(false),
}, (t) => [index("cp_comp_idx").on(t.competitionId)]);

/**
 * v0.19 — Historial de resets de temporada del ladder. `settings.ladder_since`
 * solo guarda el último; esto guarda todos, para marcarlos en la gráfica.
 */
export const seasonResets = pgTable("season_resets", {
  id: text("id").primaryKey(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  note: text("note").notNull().default(""),
  createdBy: text("created_by").references(() => players.id, { onDelete: "set null" }),
});

/**
 * v0.18 — El mazo con el que cada uno juega una liga, declarado y BLOQUEADO.
 *
 * Tabla aparte y no columnas en `competition_players`: `saveCompetition`
 * borra y vuelve a crear esas filas cada vez que se edita la competición, y
 * con ellas se iría el mazo bloqueado.
 *
 * Privado: solo lo ven su dueño y los organizadores. Por eso NO entra en el
 * snapshot (que acaba serializado en el HTML): se pide con `leagueDecksOf`
 * y se filtra por permisos en el servidor.
 */
export const leagueDecks = pgTable("league_decks", {
  competitionId: text("competition_id").notNull().references(() => competitions.id, { onDelete: "cascade" }),
  playerId: text("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  deckId: text("deck_id").references(() => decks.id, { onDelete: "set null" }),
  archetypeId: text("archetype_id").references(() => archetypes.id, { onDelete: "set null" }),
  lockedAt: timestamp("locked_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: text("created_by").references(() => players.id, { onDelete: "set null" }),
  /** v0.23 — 1 a 3. «Bo3 · hasta 3 mazos» usa varios; las demás, solo el 1. */
  slot: integer("slot").notNull().default(1),
}, (t) => [uniqueIndex("league_decks_slot_idx").on(t.competitionId, t.playerId, t.slot)]);

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
  /**
   * v0.15 — En una ronda de torneo, el rival cuando es alguien del grupo.
   *
   * `playerBId` se queda nulo a propósito: la ronda sigue siendo «tu» ronda
   * del torneo (índice único por torneo + jugador + ronda, récord y mazo
   * heredado), y no una partida interna que mueva Elo. Esta columna solo
   * enlaza al perfil y alimenta el mapa de enfrentamientos directos.
   * `opponentName` se sigue rellenando con su nombre.
   */
  opponentPlayerId: text("opponent_player_id").references(() => players.id, { onDelete: "set null" }),
  deckAId: text("deck_a_id").references(() => decks.id, { onDelete: "set null" }),
  deckBId: text("deck_b_id").references(() => decks.id, { onDelete: "set null" }),
  /**
   * Tu propio arquetipo, cuando lo que jugaste no tiene mazo registrado.
   *
   * Mismo patrón que `opponentArchetypeId`, pero para tu lado: "bloquear el
   * mismo mazo para todo el torneo" tenía que funcionar también eligiendo
   * solo el arquetipo, sin lista de 60 cartas. Mutuamente excluyente con
   * `deckAId` — o uno o el otro, nunca los dos.
   */
  archetypeAId: text("archetype_a_id").references(() => archetypes.id, { onDelete: "set null" }),
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
  index("matches_opp_player_idx").on(t.opponentPlayerId),
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
  /** "HH:MM" en 24h, hora local del evento. Nulo si no se sabe. */
  startTime: text("start_time"),
  /** Precio de la entrada, en céntimos (500 = 5,00 €). Nulo si no se sabe o fue gratis sin anotar. */
  entryFeeCents: integer("entry_fee_cents"),
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
  /** Última jornada, para los eventos de dos o tres días. */
  endDate: date("end_date"),
  /** round · tourney · deadline · other */
  kind: text("kind").notNull().default("round"),
  /**
   * Tipo de evento de Play! Pokémon, cuando lo hay: `regional`,
   * `international`, `league_cup`… Es lo que decide el **color** en el
   * calendario y lo que se puede filtrar.
   *
   * Aparte de `kind` y no en su lugar: `kind` dice qué clase de cosa es para
   * la liga (una jornada, una fecha límite) y esto dice qué clase de torneo
   * es en el circuito. Una jornada de liga no es ninguno de los dos tipos de
   * torneo, y un Regional al que no va nadie del grupo no es una jornada.
   */
  tournamentKind: text("tournament_kind").notNull().default(""),
  /** "Frankfurt, Alemania". Texto libre: no hay tabla de ciudades. */
  location: text("location").notNull().default(""),
  /** Enlace a la página oficial del evento, si la hay. */
  url: text("url").notNull().default(""),
  competitionId: text("competition_id").references(() => competitions.id, { onDelete: "set null" }),
  tournamentId: text("tournament_id").references(() => tournaments.id, { onDelete: "set null" }),
  note: text("note").notNull().default(""),
});

/* ------------------------------------------- metagame presencial --- */

/*
   Lo que se jugó en un Regional, sin una sola persona dentro.

   POR QUÉ EXISTEN ESTAS DOS TABLAS
   --------------------------------
   La API de Limitless sirve su plataforma **online**. Los Regionales
   presenciales están en su web y en RK9, y de ahí no se saca nada
   automáticamente: RK9 prohíbe expresamente la extracción automatizada, y
   Limitless dejó los presenciales fuera de la API a propósito. Así que el
   metagame de papel entra a mano, pegando la clasificación una vez al mes.

   LO QUE NO SE GUARDA, Y POR QUÉ ESTÁ EN EL ESQUEMA Y NO EN UNA NORMA
   ------------------------------------------------------------------
   Una clasificación de Regional son entre ochocientas y dos mil personas con
   nombre y apellidos que no se han dado de alta en nada. Guardar eso sería
   tratar datos personales de gente ajena sin ninguna base para hacerlo.

   Por eso `meta_entries` **no tiene columna de nombre**. No es que no se
   rellene: es que no existe. El parser (`lib/sources/standings.ts`) tira el
   nombre antes de devolver la fila, y aquí no hay sitio donde ponerlo aunque
   alguien lo intentara. Una norma se olvida; una tabla sin columna, no.

   Lo que queda es el arquetipo por puesto, que es justamente lo que se quiere
   saber: qué cortó, qué ganó y en qué proporción.
*/

/** Un evento presencial del circuito cuyo metagame se ha importado. */
export const metaEvents = pgTable("meta_events", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  date: date("date").notNull(),
  /** regional · international · special · worlds · league_cup · other */
  kind: text("kind").notNull().default("regional"),
  /** "Lille, Francia". Texto libre, igual que en `events`. */
  location: text("location").notNull().default(""),
  format: text("format").notNull().default("standard"),
  division: text("division").notNull().default("masters"),
  /** Temporada de Play! Pokémon. Se deduce de la fecha si no se dice. */
  season: integer("season"),
  /** Asistencia total, si se sabe. Sirve para poner el corte en contexto. */
  playerCount: integer("player_count"),
  /** Tamaño del corte (8, 16, 32…). */
  topCut: integer("top_cut"),
  /**
   * Hasta qué puesto llega lo importado.
   *
   * No es lo mismo pegar el top 8 que los 1.200 de la clasificación entera, y
   * la diferencia cambia por completo cómo se leen los porcentajes. Se guarda
   * para que la pantalla pueda decir «esto es el top 32», en vez de dar a
   * entender que es el metagame del evento completo.
   */
  coverage: integer("coverage"),
  /** De dónde se copió. Se enseña como cita, no se llama nunca. */
  sourceUrl: text("source_url").notNull().default(""),
  sourceName: text("source_name").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdBy: text("created_by").references(() => players.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  // Nombre + fecha + división es la identidad de un evento. Volver a importar
  // el mismo —porque al pegarlo la primera vez aún no estaba el top cut—
  // actualiza en vez de duplicar.
  //
  // La división está ahí porque el mismo Regional tiene Masters, Seniors y
  // Juniors, con el mismo nombre y la misma fecha y clasificaciones
  // distintas. Sin ella, importar Seniors pisaba Masters en silencio.
  uniqueIndex("meta_events_ident_idx").on(t.name, t.date, t.division),
  index("meta_events_date_idx").on(t.date),
  index("meta_events_kind_idx").on(t.kind),
]);

/**
 * Un puesto de la clasificación, o una línea de un resumen por mazos.
 *
 * Dos formas en una tabla, y se distinguen por `placement`:
 *
 * · Clasificación pegada → una fila por puesto, `placement` 1..N, `copies` 1.
 * · Resumen «mazo · cuántos» → `placement` nulo y `copies` con el número.
 *
 * Están juntas porque para contar cuota da igual: se suma `copies` en los dos
 * casos. Lo que solo tiene la primera forma es la conversión a top 8, que
 * necesita saber el puesto — y por eso el resumen no la calcula en vez de
 * inventársela.
 */
export const metaEntries = pgTable("meta_entries", {
  id: serial("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => metaEvents.id, { onDelete: "cascade" }),
  /** Puesto final. Nulo en las filas de resumen. */
  placement: integer("placement"),
  /** Cuántas listas representa esta fila. 1 en una clasificación. */
  copies: integer("copies").notNull().default(1),
  /** El arquetipo de vuestro catálogo, si el nombre casó con alguno. */
  archetypeId: text("archetype_id").references(() => archetypes.id, { onDelete: "set null" }),
  /** El nombre tal y como venía en la fuente. Siempre se guarda. */
  archetypeName: text("archetype_name").notNull(),
  /** Slugs para los sprites, deducidos del nombre si no hubo arquetipo. */
  main: text("main").notNull().default(""),
  secondary: text("secondary").notNull().default(""),
  wins: integer("wins"),
  losses: integer("losses"),
  ties: integer("ties"),
}, (t) => [
  index("meta_entries_event_idx").on(t.eventId),
  // Un puesto no se repite dentro de un evento. Es lo que hace que volver a
  // pegar una clasificación corregida no deje dos primeros.
  uniqueIndex("meta_entries_place_idx")
    .on(t.eventId, t.placement)
    .where(sql`${t.placement} is not null`),
]);

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
export type MetaEvent = typeof metaEvents.$inferSelect;
export type MetaEntry = typeof metaEntries.$inferSelect;
