-- v0.124.0 — Dos tablas pequeñas, aparte (y no columnas de tournaments/players)
-- para que el código nuevo funcione aunque esto no se haya aplicado todavía.
-- Idempotente. Aplicar primero en la rama dev de Neon.

-- La dirección postal de cada torneo.
CREATE TABLE IF NOT EXISTS tournament_direcciones (
  tournament_id text PRIMARY KEY REFERENCES tournaments(id) ON DELETE CASCADE,
  direccion text NOT NULL
);

-- El nombre de cada jugador en Play! Pokémon, para casar la clasificación oficial pegada.
CREATE TABLE IF NOT EXISTS player_nombres_oficiales (
  player_id text PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  nombre text NOT NULL
);
