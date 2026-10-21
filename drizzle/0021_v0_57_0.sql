-- v0.57.0 — formato del top cut, si es distinto del suizo. Idempotente.
-- Nulo = el corte se juega como el suizo (lo que pasaba siempre hasta ahora).
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS best_of_top integer;
