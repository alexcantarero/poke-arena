-- v0.117.0 — El post del foro de Discord de cada enfrentamiento de la liga.
-- Idempotente. Aplicar primero en la rama dev de Neon (después de la 0033).

CREATE TABLE IF NOT EXISTS discord_hilos (
  match_id text PRIMARY KEY REFERENCES matches(id) ON DELETE CASCADE,
  hilo_id text NOT NULL,
  creado_at timestamptz NOT NULL DEFAULT now()
);
