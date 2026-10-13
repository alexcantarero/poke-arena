-- v0.30.0 — premios por juego y penalización de premios.
-- Idempotente: se puede lanzar dos veces sin romper nada.

-- 1. Premios que cogió cada lado en el juego. Nulo = no apuntado.
ALTER TABLE games ADD COLUMN IF NOT EXISTS prizes_a integer;
ALTER TABLE games ADD COLUMN IF NOT EXISTS prizes_b integer;

-- 2. Quién recibió una penalización de premios en ese juego.
--    La sufre el marcado y beneficia al otro: su objetivo baja de 6 a 4.
--    No reparte premios (Penalty Guidelines de Play! Pokémon).
ALTER TABLE games ADD COLUMN IF NOT EXISTS penalty_a boolean NOT NULL DEFAULT false;
ALTER TABLE games ADD COLUMN IF NOT EXISTS penalty_b boolean NOT NULL DEFAULT false;

-- 3. Rango 0–6, por si alguien escribe por la API en vez de por el formulario.
DO $$
BEGIN
  ALTER TABLE games ADD CONSTRAINT games_prizes_a_rango CHECK (prizes_a IS NULL OR (prizes_a >= 0 AND prizes_a <= 6));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE games ADD CONSTRAINT games_prizes_b_rango CHECK (prizes_b IS NULL OR (prizes_b >= 0 AND prizes_b <= 6));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Retirar `prizes_left`, PERO SOLO SI ESTÁ VACÍA.
--
--    Era una sola columna para los dos lados, así que no sirve para lo que
--    hace falta ahora. La acción la leía (`g{i}_prizes`) pero ningún
--    formulario la enviaba nunca, así que debería estar entera a NULL. La
--    comprobación está aquí justamente para no fiarse de ese «debería»: si
--    hubiera un solo valor, la columna se queda y no se pierde nada.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'games' AND column_name = 'prizes_left')
     AND NOT EXISTS (SELECT 1 FROM games WHERE prizes_left IS NOT NULL) THEN
    ALTER TABLE games DROP COLUMN prizes_left;
    RAISE NOTICE 'prizes_left estaba vacía y se ha retirado.';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name = 'games' AND column_name = 'prizes_left') THEN
    RAISE NOTICE 'prizes_left TIENE DATOS: se conserva. Míralos antes de borrarla a mano.';
  END IF;
END $$;
