-- =========================================================================
-- Arena v0.15.0 — el rival de una ronda puede ser alguien del grupo.
--
-- Una columna nueva en `matches`: `opponent_player_id`. Solo se usa en las
-- rondas de torneo (las que tienen `player_b_id` nulo). Enlaza la ronda con
-- el perfil del rival y alimenta el mapa de enfrentamientos directos del
-- Ranking. `player_b_id` sigue nulo: esas rondas no mueven Elo.
--
-- Además rellena las rondas que ya existían cuyo rival se escribió con el
-- nombre EXACTO de alguien del grupo (sin distinguir mayúsculas), siempre que
-- ese nombre no lo tengan dos personas.
--
-- Pégalo entero en el SQL Editor de Neon. Es idempotente.
-- `npm run db:push` crea la columna y el índice, pero NO hace el relleno.
-- =========================================================================

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS opponent_player_id text
  REFERENCES players(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS matches_opp_player_idx ON matches (opponent_player_id);

UPDATE matches m
   SET opponent_player_id = p.id
  FROM players p
 WHERE m.player_b_id IS NULL
   AND m.tournament_id IS NOT NULL
   AND m.opponent_player_id IS NULL
   AND m.opponent_name IS NOT NULL
   AND lower(trim(m.opponent_name)) = lower(trim(p.name))
   AND p.id <> m.player_a_id
   AND (SELECT count(*) FROM players p2
         WHERE lower(trim(p2.name)) = lower(trim(p.name))) = 1;
