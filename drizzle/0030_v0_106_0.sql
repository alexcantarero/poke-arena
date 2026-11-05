-- v0.106.0 — «Iré / Quizá / No iré» en el calendario. Idempotente.
CREATE TABLE IF NOT EXISTS asistencias (
  player_id text NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  item text NOT NULL,
  estado text NOT NULL CHECK (estado IN ('si', 'quiza', 'no')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, item)
);
