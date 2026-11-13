-- v0.124.0 — La dirección postal de cada torneo. Tabla aparte (y no una columna
-- de tournaments) para que el código nuevo funcione aunque esto no se haya
-- aplicado todavía. Idempotente. Aplicar primero en la rama dev de Neon.

CREATE TABLE IF NOT EXISTS tournament_direcciones (
  tournament_id text PRIMARY KEY REFERENCES tournaments(id) ON DELETE CASCADE,
  direccion text NOT NULL
);
