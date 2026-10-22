-- v0.65.0 — los logros secretos de cada cuenta. Idempotente.
ALTER TABLE players ADD COLUMN IF NOT EXISTS logros text NOT NULL DEFAULT '';
