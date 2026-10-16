-- v0.45.0 — segunda fase suiza propia en los torneos. Idempotente.
--
-- `rounds` sigue siendo el TOTAL de rondas suizas. Esta columna dice cuántas
-- de ellas son de la segunda fase, para torneos con una estructura que no
-- sale de la tabla oficial (los online de Limitless, p. ej. 8 + 3 y top 8).
-- Nulo = sin segunda fase propia: manda la tabla oficial, como hasta ahora.
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS rounds_phase2 integer;

DO $$
BEGIN
  ALTER TABLE tournaments ADD CONSTRAINT tournaments_rounds_phase2_rango
    CHECK (rounds_phase2 IS NULL OR (rounds_phase2 >= 1 AND rounds_phase2 <= 30));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
