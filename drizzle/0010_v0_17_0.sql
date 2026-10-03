-- =========================================================================
-- Arena v0.17.0 — favoritos y puesto en la clasificación oficial.
--
--   · `players.rank_spain` / `rank_europe` / `rank_zone_updated_at`: el puesto
--     en el leaderboard de CP de Play! Pokémon, apuntado a mano.
--   · `player_favorites`: a quién sigue cada uno, para recortar el Ranking.
--
-- Pégalo entero en el SQL Editor de Neon. Es idempotente: se puede lanzar
-- dos veces sin romper nada. `npm run db:push` hace lo mismo.
-- =========================================================================

ALTER TABLE players ADD COLUMN IF NOT EXISTS rank_spain integer;
ALTER TABLE players ADD COLUMN IF NOT EXISTS rank_europe integer;
ALTER TABLE players ADD COLUMN IF NOT EXISTS rank_zone_updated_at timestamptz;

-- Un puesto es 1 o más. Se comprueba también en la Server Action, pero una
-- Server Action es un endpoint público y esto es la última barrera.
DO $$ BEGIN
  ALTER TABLE players ADD CONSTRAINT players_rank_spain_chk CHECK (rank_spain IS NULL OR rank_spain >= 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE players ADD CONSTRAINT players_rank_europe_chk CHECK (rank_europe IS NULL OR rank_europe >= 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS player_favorites (
  player_id   text NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  favorite_id text NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS player_fav_unique_idx ON player_favorites (player_id, favorite_id);
CREATE INDEX IF NOT EXISTS player_fav_player_idx ON player_favorites (player_id);
