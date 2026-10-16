-- v0.47.0 — umbrales de paso de fase en torneos con estructura propia.
-- Idempotente. Tres columnas que pueden quedar vacías: no cambia ningún dato.
--
-- La regla que guardan: pasan los que lleguen a los puntos O el top N, lo que
-- dé más gente (p. ej. Moujii's Dojo: 16 puntos o top 8 a la fase 2).
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS phase2_points integer;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS phase2_top integer;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS cut_points integer;

DO $$
BEGIN
  ALTER TABLE tournaments ADD CONSTRAINT tournaments_umbrales_rango CHECK (
    (phase2_points IS NULL OR phase2_points BETWEEN 1 AND 150) AND
    (phase2_top    IS NULL OR phase2_top    BETWEEN 2 AND 512) AND
    (cut_points    IS NULL OR cut_points    BETWEEN 1 AND 150));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
