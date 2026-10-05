-- =========================================================================
-- PokeArena TCG v0.23.0 — modalidades de liga.
--
--   · competitions.modality: mazo_fijo (por defecto, como hasta ahora),
--     tres_mazos (Bo3 con hasta 3 mazos) o equipos (duelo por equipos de 3).
--   · league_decks.slot: hasta 3 mazos por persona y liga. La clave única
--     pasa de (liga, jugador) a (liga, jugador, hueco). Los mazos que ya
--     estaban entregados quedan en el hueco 1.
--   · competition_teams: los equipos y sus miembros en orden.
--
-- Pégalo entero en el SQL Editor de Neon. Es idempotente. `db:push` no
-- cambia bien el índice único: lanza este fichero.
-- =========================================================================

ALTER TABLE competitions ADD COLUMN IF NOT EXISTS modality text NOT NULL DEFAULT 'mazo_fijo';

ALTER TABLE league_decks ADD COLUMN IF NOT EXISTS slot integer NOT NULL DEFAULT 1;
DROP INDEX IF EXISTS league_decks_unique_idx;
CREATE UNIQUE INDEX IF NOT EXISTS league_decks_slot_idx ON league_decks (competition_id, player_id, slot);
DO $$ BEGIN
  ALTER TABLE league_decks ADD CONSTRAINT league_decks_slot_range CHECK (slot BETWEEN 1 AND 3);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS competition_teams (
  id             text PRIMARY KEY,
  competition_id text NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  name           text NOT NULL,
  members        jsonb NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS competition_teams_comp_idx ON competition_teams (competition_id);
