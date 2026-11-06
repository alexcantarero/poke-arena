CREATE TABLE IF NOT EXISTS belt_registrations (
  event_id text NOT NULL,
  player_id text NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  registered_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, player_id)
);
