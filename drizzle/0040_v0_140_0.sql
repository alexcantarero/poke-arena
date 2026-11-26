-- v0.140.0 — Notificaciones push (suscripciones y avisos enviados) y confirmación
-- de resultados de liga. Tablas aparte: sin migrar, la app funciona sin esto.
-- Idempotente. Aplicar primero en la rama dev de Neon.

CREATE TABLE IF NOT EXISTS push_suscripciones (
  endpoint text PRIMARY KEY,
  player_id text NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_suscripciones_player_idx ON push_suscripciones (player_id);

CREATE TABLE IF NOT EXISTS push_enviados (
  clave text PRIMARY KEY,
  enviado_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS confirmaciones_liga (
  match_id text PRIMARY KEY REFERENCES matches(id) ON DELETE CASCADE,
  reportado_por text NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  rival_id text NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  reportado_at timestamptz NOT NULL DEFAULT now(),
  estado text NOT NULL DEFAULT 'pendiente',
  resuelto_at timestamptz
);
