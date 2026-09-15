-- =========================================================================
-- Arena v0.5.0 — hora y precio del torneo, mazo propio solo por arquetipo,
-- y League Cup/Challenge como único nombre (adiós a los alias "Pokémon").
--
-- Pégalo entero en el SQL Editor de Neon. Es idempotente: ejecutarlo dos
-- veces no hace nada la segunda.
--
-- `npm run db:push` ya crea las columnas nuevas leyendo el esquema de
-- Drizzle. Lo que NO sale de ahí es la limpieza de datos y el CHECK, y por
-- eso existe este fichero.
--
-- Orden recomendado:
--   1. npm run db:push
--   2. este fichero
--   3. las comprobaciones del final
-- =========================================================================

-- ------------------------------------------------------------------ torneos
-- Hora de inicio ("HH:MM") y precio de entrada (céntimos). Los dos nulos por
-- defecto: para lo que ya existe no se sabe ninguno de los dos, y no pasa
-- nada por no saberlo.
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS start_time text;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS entry_fee_cents integer;

DO $$ BEGIN
  ALTER TABLE tournaments
    ADD CONSTRAINT tournaments_start_time_chk
    CHECK (start_time IS NULL OR start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE tournaments
    ADD CONSTRAINT tournaments_entry_fee_chk
    CHECK (entry_fee_cents IS NULL OR entry_fee_cents >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- "Pokémon Cup" y "Pokémon Challenge" dejan de poder elegirse al crear un
-- torneo (con League Cup / League Challenge basta: puntúan exactamente
-- igual, y tener las dos en el desplegable era la confusión que Alex
-- señalaba). Los torneos que ya existan con esos tipos se pasan a su
-- equivalente; el motor de CP los sigue reconociendo como alias por si algún
-- dato viejo se cuela, pero ya no hace falta.
UPDATE tournaments SET kind = 'league_challenge' WHERE kind = 'pokemon_challenge';
UPDATE tournaments SET kind = 'league_cup' WHERE kind = 'pokemon_cup';

-- --------------------------------------------------------------- partidas
-- Tu propio arquetipo, cuando lo que jugaste no tiene mazo registrado.
-- Mismo patrón que `opponent_archetype_id`, que ya existía para el rival.
ALTER TABLE matches ADD COLUMN IF NOT EXISTS archetype_a_id text;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
     WHERE c.conrelid = 'matches'::regclass
       AND c.contype = 'f'
       AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute
                              WHERE attrelid = 'matches'::regclass AND attname = 'archetype_a_id')]
  ) THEN
    ALTER TABLE matches
      ADD CONSTRAINT matches_archetype_a_id_fk
      FOREIGN KEY (archetype_a_id) REFERENCES archetypes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =========================================================================
-- Comprobaciones. Descoméntalas y ejecútalas para ver que todo está.
-- =========================================================================

-- 1. Ya no debe quedar ningún torneo con los tipos retirados.
-- SELECT kind, count(*) FROM tournaments WHERE kind IN ('pokemon_challenge', 'pokemon_cup') GROUP BY kind;

-- 2. Las columnas nuevas están donde tienen que estar.
-- SELECT column_name, is_nullable FROM information_schema.columns
--  WHERE table_name = 'tournaments' AND column_name IN ('start_time', 'entry_fee_cents');
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name = 'matches' AND column_name = 'archetype_a_id';

-- 3. Que el CHECK de la hora rechaza lo que debe (esto TIENE que fallar):
-- UPDATE tournaments SET start_time = '25:99' WHERE true;
