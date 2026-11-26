-- v0.138.0 — Registro de predicciones del modelo de cruces (para medir su acierto).
-- Tabla aparte: sin migrar, la app funciona y simplemente no registra.
-- Idempotente. Aplicar primero en la rama dev de Neon.

CREATE TABLE IF NOT EXISTS predicciones (
  match_id text PRIMARY KEY REFERENCES matches(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  mazo_a text NOT NULL,
  mazo_b text NOT NULL,
  p real NOT NULL,
  n_ef real NOT NULL DEFAULT 0,
  resultado real,
  parametros text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
