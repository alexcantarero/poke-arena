-- ============================================================
-- Arena v0.3.0
--
-- `npm run db:push` ya aplica solo las columnas y la tabla nuevas: lee
-- src/db/schema.ts y cuadra la base de datos con él. Este fichero está por
-- dos motivos:
--
--   1. Los CHECK no salen del esquema de Drizzle, así que hay que ponerlos
--      a mano. Y el del ladder importa: una Server Action es un endpoint
--      público y a `setLadderElo` se le puede llamar con 99999 desde la
--      consola del navegador. El formulario y la acción ya lo acotan; esto
--      es la tercera red.
--   2. Si prefieres verlo antes de tocar nada, pégalo en el SQL Editor de
--      Neon en lugar de ejecutar db:push a ciegas.
--
-- Es idempotente: se puede ejecutar dos veces sin romper nada.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Ladder manual de rangos
-- ------------------------------------------------------------
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "ladder_elo" integer;
--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "ladder_elo_updated_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "ladder_note" text DEFAULT '' NOT NULL;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "players" ADD CONSTRAINT "players_ladder_elo_range"
    CHECK ("ladder_elo" IS NULL OR ("ladder_elo" >= 1500 AND "ladder_elo" <= 2000));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "ladder_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"player_id" text NOT NULL,
	"elo" integer NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "ladder_entries" ADD CONSTRAINT "ladder_entries_player_id_players_id_fk"
    FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "ladder_entries" ADD CONSTRAINT "ladder_entries_created_by_players_id_fk"
    FOREIGN KEY ("created_by") REFERENCES "players"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "ladder_entries" ADD CONSTRAINT "ladder_entries_elo_range"
    CHECK ("elo" >= 1500 AND "elo" <= 2000);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "ladder_player_idx" ON "ladder_entries" ("player_id");
--> statement-breakpoint

-- ------------------------------------------------------------
-- 2. Rondas de torneo
--
-- No hay tabla nueva: una ronda es una fila de `matches` con `tournament_id`
-- y `round`, que ya existían. Solo faltaban dos datos que antes no tenían
-- dónde vivir.
-- ------------------------------------------------------------

-- El resultado de la serie apuntado a mano, para el registro rápido: a veces
-- solo se sabe «esta ronda la gané» y no el desglose juego a juego. Y resuelve
-- una ambigüedad que si no es irresoluble: un 1–1 esperando el tercer juego y
-- un 1–1 con el tiempo agotado tienen los mismos juegos apuntados.
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "series_result" text;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "matches" ADD CONSTRAINT "matches_series_result_check"
    CHECK ("series_result" IS NULL OR "series_result" IN ('a', 'b', 'tie'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint

-- Quién salió primero en el primer juego. En una ronda de suizo lo decide la
-- moneda y es el dato que se recuerda; del segundo y el tercero ya lo decide
-- el resultado anterior. Si hay filas en `games`, `games.first` es la fuente
-- buena y esto es una copia.
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "first_turn" text DEFAULT '' NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "matches" ADD CONSTRAINT "matches_first_turn_check"
    CHECK ("first_turn" IN ('', 'a', 'b'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint

-- Una ronda es única por torneo y jugador: evita duplicar la ronda 3 con un
-- doble toque en el móvil. Parcial, porque las partidas de la liga interna no
-- llevan torneo y comparten `round` sin ningún problema.
CREATE UNIQUE INDEX IF NOT EXISTS "matches_tour_round_idx"
  ON "matches" ("tournament_id", "player_a_id", "round")
  WHERE "tournament_id" IS NOT NULL;
--> statement-breakpoint

-- ------------------------------------------------------------
-- 3. Comprobación
--
-- Ejecuta esto después y compara: tienen que salir las cinco columnas y la
-- tabla nueva.
-- ------------------------------------------------------------
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name = 'players' AND column_name LIKE 'ladder%';
--  -- esperado: ladder_elo, ladder_elo_updated_at, ladder_note
--
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name = 'matches' AND column_name IN ('series_result', 'first_turn');
--  -- esperado: las dos
--
-- SELECT to_regclass('ladder_entries');   -- esperado: ladder_entries
