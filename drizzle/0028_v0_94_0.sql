-- v0.94.0 — título elegido en el perfil. Idempotente.
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS profile_title text NOT NULL DEFAULT '';
