-- =========================================================================
-- Arena v0.12.0 — el metagame presencial.
--
-- Dos tablas nuevas para guardar lo que se jugó en un Regional: qué mazos
-- cortaron y en qué puesto. Nada más.
--
-- LO QUE NO HAY, Y ES LO IMPORTANTE
-- ---------------------------------
-- `meta_entries` NO tiene columna de nombre de jugador. No es que se deje
-- vacía: es que no existe. Una clasificación de Regional son cientos o miles
-- de personas que no se han dado de alta en nada, y guardar sus nombres sería
-- tratar datos personales de gente ajena sin ninguna base para hacerlo.
--
-- El importador descarta el nombre al leer la línea, y aquí no hay sitio
-- donde ponerlo aunque alguien lo intentara. Si alguna vez te ves añadiendo
-- esa columna, párate: no hace falta para nada de lo que la app calcula.
--
-- Pégalo entero en el SQL Editor de Neon. Es idempotente: se puede lanzar dos
-- veces sin romper nada.
--
-- `npm run db:push` hace lo mismo leyendo el esquema de Drizzle.
-- =========================================================================

-- ------------------------------------------------- eventos importados
CREATE TABLE IF NOT EXISTS meta_events (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  date          date NOT NULL,
  kind          text NOT NULL DEFAULT 'regional',
  location      text NOT NULL DEFAULT '',
  format        text NOT NULL DEFAULT 'standard',
  division      text NOT NULL DEFAULT 'masters',
  season        integer,
  player_count  integer,
  top_cut       integer,
  -- Hasta qué puesto llega lo importado. Sin esto, un top 8 y una
  -- clasificación completa se leerían como si midieran lo mismo, y no lo
  -- miden: el corte está elegido por resultados.
  coverage      integer,
  source_url    text NOT NULL DEFAULT '',
  source_name   text NOT NULL DEFAULT '',
  notes         text NOT NULL DEFAULT '',
  created_by    text REFERENCES players(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Nombre + fecha + división es la identidad de un evento: volver a importarlo
-- cuando ya esté cerrado el top cut lo actualiza en vez de duplicarlo.
--
-- La división está ahí porque el mismo Regional tiene Masters, Seniors y
-- Juniors, con el mismo nombre y la misma fecha y clasificaciones distintas.
CREATE UNIQUE INDEX IF NOT EXISTS meta_events_ident_idx
  ON meta_events (name, date, division);
CREATE INDEX IF NOT EXISTS meta_events_date_idx ON meta_events (date);
CREATE INDEX IF NOT EXISTS meta_events_kind_idx ON meta_events (kind);

-- --------------------------------------------------------- las filas
-- Un puesto con su mazo. Repito: ninguna columna de persona.
CREATE TABLE IF NOT EXISTS meta_entries (
  id             serial PRIMARY KEY,
  event_id       text NOT NULL REFERENCES meta_events(id) ON DELETE CASCADE,
  -- Nulo en las filas que vienen de un desglose «mazo — número», que no
  -- tienen puesto. Por eso la conversión a top 8 solo cuenta las que sí.
  placement      integer,
  copies         integer NOT NULL DEFAULT 1,
  archetype_id   text REFERENCES archetypes(id) ON DELETE SET NULL,
  archetype_name text NOT NULL,
  main           text NOT NULL DEFAULT '',
  secondary      text NOT NULL DEFAULT '',
  wins           integer,
  losses         integer,
  ties           integer
);

CREATE INDEX IF NOT EXISTS meta_entries_event_idx ON meta_entries (event_id);
-- Un puesto no se repite dentro de un evento: es lo que hace que volver a
-- pegar una clasificación corregida no deje dos primeros.
CREATE UNIQUE INDEX IF NOT EXISTS meta_entries_place_idx
  ON meta_entries (event_id, placement) WHERE placement IS NOT NULL;

-- ------------------------------------------------------------ comprobación
--   SELECT to_regclass('meta_events'), to_regclass('meta_entries');
--   -- y la comprobación que de verdad importa: esto tiene que dar CERO filas.
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'meta_entries'
--      AND column_name IN ('player', 'player_name', 'name');
