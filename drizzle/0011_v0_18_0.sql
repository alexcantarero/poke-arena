-- =========================================================================
-- PokeArena TCG v0.18.0
--
--   1. Escala nueva del ladder: 1–550 (Novato) y 1350–2100 (Liga Arceus).
--      Se cambian los dos CHECK. Los valores que ya hay (1500–2000) caben.
--   2. `settings.ladder_since`: inicio de la temporada del ladder (reset global).
--   3. `league_decks`: el mazo bloqueado de cada uno en una liga.
--
-- Pégalo entero en el SQL Editor de Neon. Es idempotente.
-- `npm run db:push` crea la columna y la tabla, pero NO cambia los CHECK:
-- este fichero hay que lanzarlo igualmente.
-- =========================================================================

-- 1. Rango del ladder -------------------------------------------------------
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_ladder_elo_range;
ALTER TABLE players ADD CONSTRAINT players_ladder_elo_range CHECK (
  ladder_elo IS NULL
  OR (ladder_elo BETWEEN 1 AND 550)
  OR (ladder_elo BETWEEN 1350 AND 2100)
);

ALTER TABLE ladder_entries DROP CONSTRAINT IF EXISTS ladder_entries_elo_range;
ALTER TABLE ladder_entries ADD CONSTRAINT ladder_entries_elo_range CHECK (
  (elo BETWEEN 1 AND 550) OR (elo BETWEEN 1350 AND 2100)
);

-- 2. Temporada del ladder ---------------------------------------------------
ALTER TABLE settings ADD COLUMN IF NOT EXISTS ladder_since timestamptz;

-- 3. Mazo de liga bloqueado -------------------------------------------------
CREATE TABLE IF NOT EXISTS league_decks (
  competition_id text NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  player_id      text NOT NULL REFERENCES players(id)      ON DELETE CASCADE,
  deck_id        text REFERENCES decks(id)      ON DELETE SET NULL,
  archetype_id   text REFERENCES archetypes(id) ON DELETE SET NULL,
  locked_at      timestamptz NOT NULL DEFAULT now(),
  created_by     text REFERENCES players(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS league_decks_unique_idx ON league_decks (competition_id, player_id);
