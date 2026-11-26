-- v0.137.0 — Dificultad de los mazos (votos) y sesiones del PTCG Live con su
-- rango del ladder. Tablas aparte: sin migrar, la app funciona sin esto.
-- Idempotente. Aplicar primero en la rama dev de Neon.

CREATE TABLE IF NOT EXISTS deck_dificultad (
  deck_id text NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  player_id text NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  nivel integer NOT NULL CHECK (nivel BETWEEN 1 AND 5),
  PRIMARY KEY (deck_id, player_id)
);

CREATE TABLE IF NOT EXISTS live_sesiones (
  id text PRIMARY KEY,
  deck_id text NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  player_id text NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  desde date NOT NULL,
  hasta date NOT NULL,
  rango integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS live_sesiones_deck_idx ON live_sesiones (deck_id);
