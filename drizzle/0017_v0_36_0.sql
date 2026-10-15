-- v0.36.0 — nick de Limitless por jugador, para importar los torneos online
-- que habéis jugado. Idempotente.

ALTER TABLE players ADD COLUMN IF NOT EXISTS limitless_handle text;

-- Dos personas no pueden compartir nick: si pasara, un resultado se le
-- asignaría a quien saliera primero y el otro se quedaría sin su torneo, sin
-- un solo error por ninguna parte. El índice es parcial porque la mayoría lo
-- tendrá a NULL y varios NULL no chocan entre sí.
CREATE UNIQUE INDEX IF NOT EXISTS players_limitless_handle_idx
  ON players (lower(limitless_handle))
  WHERE limitless_handle IS NOT NULL AND limitless_handle <> '';
