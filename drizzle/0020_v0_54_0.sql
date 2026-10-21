-- v0.54.0 — rastro de correcciones en las partidas. Idempotente.
-- Quién cambió el resultado por última vez, y cuándo. Nulo = nunca se corrigió.
ALTER TABLE matches ADD COLUMN IF NOT EXISTS updated_by text REFERENCES players(id) ON DELETE SET NULL;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS updated_at timestamptz;
