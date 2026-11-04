-- v0.95.0 — lecturas de uso del plan gratuito (Neon por el cron, Vercel a mano). Idempotente.
CREATE TABLE IF NOT EXISTS uso_lecturas (
  id text PRIMARY KEY,
  fecha date NOT NULL,
  fuente text NOT NULL,
  datos jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text REFERENCES players(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uso_lecturas_dia_fuente_idx ON uso_lecturas (fecha, fuente);
