-- =========================================================================
-- Arena v0.8.0 — ámbito del Elo y partidas de Pokémon TCG Live.
--
-- Pégalo entero en el SQL Editor de Neon. Es idempotente: ejecutarlo dos
-- veces no hace nada la segunda.
--
-- `npm run db:push` ya crea la columna y la tabla leyendo el esquema de
-- Drizzle. Este fichero existe para quien prefiera aplicarlo a mano, y para
-- dejar por escrito qué cambió y por qué.
--
-- Orden recomendado:
--   1. npm run db:push      (o este fichero, uno de los dos)
--   2. las comprobaciones del final
-- =========================================================================

-- ----------------------------------------------------------------- ajustes
-- Qué partidas mueven el Elo: 'all' · 'competitive' · 'tournaments'.
--
-- Por defecto 'competitive': cuentan la liga y los torneos, y los amistosos
-- dejan de contar, que era la petición. La lectura literal —solo torneos—
-- está disponible pero no es el valor por defecto, porque dejaría el ranking
-- de una liga que juega sobre todo sus propias jornadas casi sin datos.
--
-- No hay nada que migrar: el Elo se recalcula entero desde las partidas en
-- cada carga. Al aplicar esto, el ranking sale distinto en la siguiente
-- pantalla, y se puede volver a 'all' desde Ajustes cuando se quiera.
ALTER TABLE settings ADD COLUMN IF NOT EXISTS elo_scope text NOT NULL DEFAULT 'competitive';

-- ------------------------------------------------------- Pokémon TCG Live
-- Tabla aparte de `matches` a propósito: estas partidas las apunta una sola
-- persona y contra desconocidos, así que no son verificables y no entran en
-- el ranking, el Elo ni los CP. Ver la explicación en src/db/schema.ts.
--
-- `dedupe_key` es la clave en claro —no un hash— de (jugador, fecha, mazos,
-- rival, resultado, marcador). Es UNIQUE, así que volver a importar la misma
-- hoja no duplica nada. En claro y no en hash para poder leerla cuando algo
-- no cuadre.
CREATE TABLE IF NOT EXISTS ptcg_live_matches (
  id             text PRIMARY KEY,
  player_id      text NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  date           date NOT NULL,
  my_deck        text NOT NULL,
  opponent_deck  text NOT NULL DEFAULT '',
  opponent_name  text NOT NULL DEFAULT '',
  result         text NOT NULL,
  games_won      integer,
  games_lost     integer,
  format         text NOT NULL DEFAULT '',
  dedupe_key     text NOT NULL UNIQUE,
  imported_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_player_idx ON ptcg_live_matches (player_id);

-- El resultado solo puede ser una de tres letras. Va como CHECK y no como
-- enum de Postgres porque un enum hay que migrarlo para añadirle un valor y
-- un CHECK se cambia con un ALTER.
DO $$ BEGIN
  ALTER TABLE ptcg_live_matches
    ADD CONSTRAINT ptcg_live_result_chk CHECK (result IN ('w', 'l', 'd'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------ comprobación
-- Las dos consultas siguientes tienen que devolver una fila cada una.
--
--   SELECT elo_scope FROM settings WHERE id = 'default';
--   SELECT count(*) FROM ptcg_live_matches;
