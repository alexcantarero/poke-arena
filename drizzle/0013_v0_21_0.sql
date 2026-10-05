-- =========================================================================
-- PokeArena TCG v0.21.0 — familias de arquetipos.
--
--   `archetypes.parent_id`: el arquetipo principal del que uno es variante
--   («Slowking / Drapion» → «Slowking»). Nulo = principal.
--
-- Pégalo en el SQL Editor de Neon (o `npm run db:push`). Es idempotente.
-- =========================================================================

ALTER TABLE archetypes ADD COLUMN IF NOT EXISTS parent_id text;

DO $$ BEGIN
  ALTER TABLE archetypes ADD CONSTRAINT archetypes_parent_fk
    FOREIGN KEY (parent_id) REFERENCES archetypes(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE archetypes ADD CONSTRAINT archetypes_parent_not_self CHECK (parent_id IS NULL OR parent_id <> id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS archetypes_parent_idx ON archetypes (parent_id);
