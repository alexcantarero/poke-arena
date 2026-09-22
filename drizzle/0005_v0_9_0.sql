-- =========================================================================
-- Arena v0.9.0 — calendario con tipo, sitio y enlace.
--
-- Pégalo entero en el SQL Editor de Neon. Es idempotente: ejecutarlo dos
-- veces no hace nada la segunda.
--
-- `npm run db:push` ya crea las columnas leyendo el esquema de Drizzle.
-- =========================================================================

-- ----------------------------------------------------------------- eventos
-- Cuatro columnas nuevas, todas con valor por defecto, así que lo que ya
-- existe sigue funcionando igual sin tocar una fila.
--
-- `tournament_kind` es el tipo de evento de Play! Pokémon (regional,
-- international, league_cup…) y es lo que decide el COLOR en el calendario y
-- lo que se puede filtrar. Va aparte de `kind` —que dice si es una jornada,
-- una fecha límite…— porque son dos preguntas distintas: una jornada de la
-- liga no es ningún tipo de torneo del circuito, y un Regional al que no va
-- nadie del grupo no es una jornada.
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE events ADD COLUMN IF NOT EXISTS tournament_kind text NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS url text NOT NULL DEFAULT '';

-- ------------------------------------------------------------ comprobación
--   SELECT id, title, date, end_date, tournament_kind FROM events LIMIT 5;
