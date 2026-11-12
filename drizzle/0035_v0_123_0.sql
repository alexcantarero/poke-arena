-- v0.123.0 — Causas de una derrota (o de un mal resultado), por partida y por
-- jugador. Idempotente. Aplicar primero en la rama dev de Neon.

CREATE TABLE IF NOT EXISTS match_causas (
  match_id text NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id text NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  causas jsonb NOT NULL,
  creado_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, player_id)
);
