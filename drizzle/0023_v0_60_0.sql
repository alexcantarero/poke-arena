-- v0.60.0 — el tutorial de primera vez, una vez por CUENTA. Idempotente.
-- Nulo = aún no lo ha visto: le sale al entrar. Los que ya estaban también lo verán una vez.
ALTER TABLE players ADD COLUMN IF NOT EXISTS tutorial_visto_at timestamptz;
