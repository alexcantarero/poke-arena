-- v0.67.0 — enlaces para recuperar la contraseña (se guarda el hash del token). Idempotente.
CREATE TABLE IF NOT EXISTS password_resets (
  token_hash text PRIMARY KEY,
  player_id text NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_by text REFERENCES players(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS password_resets_player_idx ON password_resets (player_id);
