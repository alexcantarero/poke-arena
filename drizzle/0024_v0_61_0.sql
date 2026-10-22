-- v0.61.0 — los tutoriales de cada página, por cuenta. Idempotente.
ALTER TABLE players ADD COLUMN IF NOT EXISTS tutoriales_vistos text NOT NULL DEFAULT '';
