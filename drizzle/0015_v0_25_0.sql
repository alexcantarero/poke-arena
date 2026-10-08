-- =========================================================================
-- PokeArena TCG v0.25.0
--
--   · games.archetype_a_id / archetype_b_id: mazo (arquetipo) de cada lado en
--     cada juego de la serie. Nulo = el de la serie, como hasta ahora.
--   · settings.featured_regional_id: el «Último Regional» de Inicio elegido a
--     mano. Nulo = el más reciente, como hasta ahora.
--
-- Pégalo en el SQL Editor de Neon (o `npm run db:push`). Es idempotente.
-- Para deshacer: DROP COLUMN de las tres columnas (no hay datos que migrar).
-- =========================================================================

ALTER TABLE games ADD COLUMN IF NOT EXISTS archetype_a_id text;
ALTER TABLE games ADD COLUMN IF NOT EXISTS archetype_b_id text;
DO $$ BEGIN
  ALTER TABLE games ADD CONSTRAINT games_archetype_a_fk
    FOREIGN KEY (archetype_a_id) REFERENCES archetypes(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE games ADD CONSTRAINT games_archetype_b_fk
    FOREIGN KEY (archetype_b_id) REFERENCES archetypes(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE settings ADD COLUMN IF NOT EXISTS featured_regional_id text;
