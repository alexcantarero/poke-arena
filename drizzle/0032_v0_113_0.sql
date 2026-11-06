ALTER TABLE players
  ADD COLUMN IF NOT EXISTS belt_holder boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS players_belt_holder_idx
  ON players (belt_holder)
  WHERE belt_holder;

CREATE TABLE IF NOT EXISTS belt_state (
  id text PRIMARY KEY,
  current_event_id text REFERENCES competitions(id) ON DELETE SET NULL,
  last_defended_at timestamptz,
  vacant_since timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO belt_state (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

UPDATE belt_state
SET current_event_id = 'cinturon-inaugural-2026'
WHERE id = 'default'
  AND current_event_id IS NULL
  AND EXISTS (
    SELECT 1 FROM competitions WHERE id = 'cinturon-inaugural-2026'
  );

CREATE TABLE IF NOT EXISTS belt_challenges (
  id text PRIMARY KEY,
  challenger_id text NOT NULL REFERENCES players(id),
  champion_id text NOT NULL REFERENCES players(id),
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  accepted_at timestamptz,
  result_winner_id text REFERENCES players(id),
  result_reported_by text REFERENCES players(id),
  result_reported_at timestamptz,
  result_confirmed_by text REFERENCES players(id),
  result_confirmed_at timestamptz,
  result_disputed_by text REFERENCES players(id),
  result_disputed_at timestamptz
);

CREATE INDEX IF NOT EXISTS belt_challenges_status_requested_idx
  ON belt_challenges (status, requested_at);

CREATE UNIQUE INDEX IF NOT EXISTS belt_challenges_holder_open_idx
  ON belt_challenges (champion_id)
  WHERE status IN ('pending', 'accepted', 'result_pending');

CREATE UNIQUE INDEX IF NOT EXISTS belt_challenges_challenger_open_idx
  ON belt_challenges (challenger_id)
  WHERE status IN ('pending', 'accepted', 'result_pending');
