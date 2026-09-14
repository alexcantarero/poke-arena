CREATE TABLE "deck_favorites" (
	"player_id" text NOT NULL,
	"deck_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ladder_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"player_id" text NOT NULL,
	"elo" integer NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "decks" ALTER COLUMN "player_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "decks" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "series_result" text;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "first_turn" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "ladder_elo" integer;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "ladder_elo_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "ladder_note" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "status" text DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "deck_favorites" ADD CONSTRAINT "deck_favorites_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_favorites" ADD CONSTRAINT "deck_favorites_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ladder_entries" ADD CONSTRAINT "ladder_entries_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ladder_entries" ADD CONSTRAINT "ladder_entries_created_by_players_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "deck_fav_unique_idx" ON "deck_favorites" USING btree ("player_id","deck_id");--> statement-breakpoint
CREATE INDEX "deck_fav_player_idx" ON "deck_favorites" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "ladder_player_idx" ON "ladder_entries" USING btree ("player_id");--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_created_by_players_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "matches_tour_round_idx" ON "matches" USING btree ("tournament_id","player_a_id","round") WHERE "matches"."tournament_id" is not null;