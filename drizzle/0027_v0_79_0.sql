-- v0.79.0 — emparejamientos importados (Trainer Hill). Idempotente.
CREATE TABLE IF NOT EXISTS matchup_imports (
  id text PRIMARY KEY,
  fuente text NOT NULL DEFAULT 'trainerhill',
  nivel text NOT NULL,
  nombre text NOT NULL DEFAULT '',
  filas jsonb NOT NULL,
  partidas integer NOT NULL DEFAULT 0,
  created_by text REFERENCES players(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
