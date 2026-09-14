-- =========================================================================
-- Arena v0.4.0 — ciclo de vida del torneo y biblioteca de mazos compartida
--
-- Pégalo entero en el SQL Editor de Neon. Es idempotente: ejecutarlo dos
-- veces no hace nada la segunda.
--
-- `npm run db:push` ya crea las columnas y la tabla nuevas leyendo el esquema
-- de Drizzle. Lo que NO sale de ahí son los CHECK, y por eso existe este
-- fichero. Importan porque las Server Actions son endpoints públicos: el
-- formulario acota, la acción vuelve a acotar, y esto es la tercera red — la
-- única que no depende de que el código esté bien.
--
-- Al final se vuelve a crear `matches_tour_round_idx` (ya venía de 0001) por si
-- se está montando una base desde cero: el registro de rondas hace un ON
-- CONFLICT contra ese índice y sin él falla en cada ronda nueva.
--
-- Orden recomendado:
--   1. npm run db:push
--   2. este fichero
--   3. las comprobaciones del final
-- =========================================================================

-- ------------------------------------------------------------------ torneos
-- Estado del ciclo: borrador -> abierto -> cerrado.
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open';
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- Los torneos que ya existían se quedan abiertos, que es como se comportaban.
UPDATE tournaments SET status = 'open' WHERE status IS NULL OR status = '';

DO $$ BEGIN
  ALTER TABLE tournaments
    ADD CONSTRAINT tournaments_status_chk
    CHECK (status IN ('draft', 'open', 'closed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------------------------- mazos
-- El dueño pasa a ser opcional: sin dueño = mazo de la biblioteca compartida.
-- Los mazos que ya existen conservan el suyo, así que nadie pierde nada.
ALTER TABLE decks ALTER COLUMN player_id DROP NOT NULL;
ALTER TABLE decks ADD COLUMN IF NOT EXISTS created_by text;

-- La clave ajena solo si no hay ya una sobre esa columna. Con `db:push`
-- ejecutado antes, Drizzle ya la habrá creado con SU nombre
-- (decks_created_by_players_id_fk); comprobar solo por nombre habría dejado
-- dos claves ajenas idénticas sobre la misma columna.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
     WHERE c.conrelid = 'decks'::regclass
       AND c.contype = 'f'
       AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute
                              WHERE attrelid = 'decks'::regclass AND attname = 'created_by')]
  ) THEN
    ALTER TABLE decks
      ADD CONSTRAINT decks_created_by_fk
      FOREIGN KEY (created_by) REFERENCES players(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Quien creó un mazo que ya existía es su dueño; es lo único que sabemos.
UPDATE decks SET created_by = player_id WHERE created_by IS NULL AND player_id IS NOT NULL;

-- --------------------------------------------------------------- favoritos
CREATE TABLE IF NOT EXISTS deck_favorites (
  player_id  text        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  deck_id    text        NOT NULL REFERENCES decks(id)   ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS deck_fav_unique_idx ON deck_favorites (player_id, deck_id);
CREATE INDEX        IF NOT EXISTS deck_fav_player_idx ON deck_favorites (player_id);

-- ------------------------------------------------------- índice de rondas
-- Parcial a propósito: las partidas de liga no llevan torneo y comparten
-- número de ronda sin problema. Estaba ya en 0001; se repite aquí porque es
-- idempotente y porque sin él el alta de rondas no funciona.
CREATE UNIQUE INDEX IF NOT EXISTS matches_tour_round_idx
  ON matches (tournament_id, player_a_id, round)
  WHERE tournament_id IS NOT NULL;

-- =========================================================================
-- Comprobaciones. Descoméntalas y ejecútalas para ver que todo está.
-- =========================================================================

-- 1. Las columnas nuevas de torneos, y cuántos hay en cada estado.
-- SELECT status, count(*) FROM tournaments GROUP BY status;

-- 2. Que player_id ya admite nulos (is_nullable debe decir YES).
-- SELECT column_name, is_nullable FROM information_schema.columns
--  WHERE table_name = 'decks' AND column_name IN ('player_id', 'created_by');

-- 3. Que la tabla de favoritos existe y está vacía.
-- SELECT count(*) FROM deck_favorites;

-- 4. Que el CHECK del estado rechaza lo que debe (esto TIENE que fallar):
-- UPDATE tournaments SET status = 'loquesea' WHERE true;
