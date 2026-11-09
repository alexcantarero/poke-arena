-- v0.116.0 — Liga por divisiones: temporadas, inscripciones (con lista de
-- espera) y a qué nivel va cada competición. Idempotente: se puede lanzar
-- varias veces. Aplicar primero en la rama dev de Neon.

CREATE TABLE IF NOT EXISTS liga_temporadas (
  id text PRIMARY KEY,
  numero integer NOT NULL,
  nombre text NOT NULL,
  estado text NOT NULL DEFAULT 'inscripcion',
  max_por_division integer NOT NULL DEFAULT 6,
  best_of integer NOT NULL DEFAULT 3,
  inicio date NOT NULL,
  semilla text,
  creada_at timestamptz NOT NULL DEFAULT now(),
  empezada_at timestamptz,
  cerrada_at timestamptz,
  campeon_id text REFERENCES players(id) ON DELETE SET NULL
);

DO $$ BEGIN
  ALTER TABLE liga_temporadas
    ADD CONSTRAINT liga_temporadas_estado_chk CHECK (estado IN ('inscripcion', 'en_curso', 'cerrada'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Como mucho una temporada abierta (en inscripción o en curso) a la vez.
CREATE UNIQUE INDEX IF NOT EXISTS liga_temporadas_una_abierta_idx
  ON liga_temporadas ((true))
  WHERE estado IN ('inscripcion', 'en_curso');

CREATE TABLE IF NOT EXISTS liga_inscripciones (
  temporada_id text NOT NULL REFERENCES liga_temporadas(id) ON DELETE CASCADE,
  player_id text NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  estado text NOT NULL DEFAULT 'inscrito',
  inscrita_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (temporada_id, player_id)
);

DO $$ BEGIN
  ALTER TABLE liga_inscripciones
    ADD CONSTRAINT liga_inscripciones_estado_chk CHECK (estado IN ('inscrito', 'espera'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS liga_divisiones (
  temporada_id text NOT NULL REFERENCES liga_temporadas(id) ON DELETE CASCADE,
  nivel integer NOT NULL,
  competition_id text NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  PRIMARY KEY (temporada_id, nivel)
);

-- La clasificación final de cada división, al cerrar la temporada: de ella sale
-- el reparto de la siguiente (suben 2, bajan 2).
ALTER TABLE liga_divisiones ADD COLUMN IF NOT EXISTS orden_final jsonb;
