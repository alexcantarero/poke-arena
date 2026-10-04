-- =========================================================================
-- PokeArena TCG v0.19.0
--
--   1. `season_resets`: historial de resets de temporada del ladder (para la
--      línea roja de la gráfica). Se rellena con el último reset conocido.
--   2. Una sola categoría «Amistoso»: las partidas de competiciones de tipo
--      «casual» (p. ej. la competición «Amistosos») pasan a ser partidas sin
--      competición, y esas competiciones se borran.
--
-- Pégalo entero en el SQL Editor de Neon. Es idempotente.
-- AVISO (punto 2): con el ajuste de Elo por defecto («liga y torneos»), las
-- partidas de la competición «Amistosos» contaban para el Elo por estar en
-- una competición. Al pasar a amistoso, dejan de contar: el Elo de algunos
-- jugadores puede moverse. Es lo coherente con «los amistosos no cuentan».
-- =========================================================================

-- 1. Historial de resets ----------------------------------------------------
CREATE TABLE IF NOT EXISTS season_resets (
  id         text PRIMARY KEY,
  at         timestamptz NOT NULL DEFAULT now(),
  note       text NOT NULL DEFAULT '',
  created_by text REFERENCES players(id) ON DELETE SET NULL
);

INSERT INTO season_resets (id, at, note)
SELECT 'sr-inicial', ladder_since, 'Reset anterior a la v0.19'
FROM settings
WHERE id = 'default' AND ladder_since IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- 2. Amistosos unificados ---------------------------------------------------
UPDATE matches SET competition_id = NULL
WHERE competition_id IN (SELECT id FROM competitions WHERE kind = 'casual');

UPDATE events SET competition_id = NULL
WHERE competition_id IN (SELECT id FROM competitions WHERE kind = 'casual');

DELETE FROM competitions WHERE kind = 'casual';
