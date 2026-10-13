CREATE TABLE "archetypes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"main" text DEFAULT '' NOT NULL,
	"secondary" text DEFAULT '' NOT NULL,
	"type" text DEFAULT 'colorless' NOT NULL,
	"limitless_id" text,
	"parent_id" text
);
--> statement-breakpoint
CREATE TABLE "competition_players" (
	"competition_id" text NOT NULL,
	"player_id" text NOT NULL,
	"seed" integer DEFAULT 0 NOT NULL,
	"dropped" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competition_teams" (
	"id" text PRIMARY KEY NOT NULL,
	"competition_id" text NOT NULL,
	"name" text NOT NULL,
	"members" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'league' NOT NULL,
	"best_of" integer DEFAULT 3 NOT NULL,
	"status" text DEFAULT 'live' NOT NULL,
	"start" date NOT NULL,
	"end" date,
	"rounds" integer DEFAULT 0 NOT NULL,
	"top_cut" integer DEFAULT 0 NOT NULL,
	"modality" text DEFAULT 'mazo_fijo' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deck_favorites" (
	"player_id" text NOT NULL,
	"deck_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decks" (
	"id" text PRIMARY KEY NOT NULL,
	"player_id" text,
	"archetype_id" text NOT NULL,
	"name" text NOT NULL,
	"list" text DEFAULT '' NOT NULL,
	"list_json" jsonb,
	"format" text DEFAULT 'standard' NOT NULL,
	"retired" boolean DEFAULT false NOT NULL,
	"created" date NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"date" date NOT NULL,
	"end_date" date,
	"kind" text DEFAULT 'round' NOT NULL,
	"tournament_kind" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"competition_id" text,
	"tournament_id" text,
	"note" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"number" integer NOT NULL,
	"winner" text NOT NULL,
	"first" text DEFAULT '' NOT NULL,
	"mulligans_a" integer DEFAULT 0 NOT NULL,
	"mulligans_b" integer DEFAULT 0 NOT NULL,
	"prizes_left" integer,
	"turns" integer,
	"note" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invites" (
	"token" text PRIMARY KEY NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"role" text DEFAULT 'player' NOT NULL,
	"max_uses" integer DEFAULT 1 NOT NULL,
	"uses" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked" boolean DEFAULT false NOT NULL,
	"created_by" text,
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
CREATE TABLE "league_decks" (
	"competition_id" text NOT NULL,
	"player_id" text NOT NULL,
	"deck_id" text,
	"archetype_id" text,
	"locked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"slot" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" text PRIMARY KEY NOT NULL,
	"competition_id" text,
	"tournament_id" text,
	"round" integer DEFAULT 0 NOT NULL,
	"date" date NOT NULL,
	"player_a_id" text NOT NULL,
	"player_b_id" text,
	"opponent_name" text,
	"opponent_player_id" text,
	"deck_a_id" text,
	"deck_b_id" text,
	"archetype_a_id" text,
	"opponent_archetype_id" text,
	"best_of" integer DEFAULT 3 NOT NULL,
	"status" text DEFAULT 'done' NOT NULL,
	"series_result" text,
	"first_turn" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meta_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"placement" integer,
	"copies" integer DEFAULT 1 NOT NULL,
	"archetype_id" text,
	"archetype_name" text NOT NULL,
	"main" text DEFAULT '' NOT NULL,
	"secondary" text DEFAULT '' NOT NULL,
	"wins" integer,
	"losses" integer,
	"ties" integer
);
--> statement-breakpoint
CREATE TABLE "meta_events" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"date" date NOT NULL,
	"kind" text DEFAULT 'regional' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"format" text DEFAULT 'standard' NOT NULL,
	"division" text DEFAULT 'masters' NOT NULL,
	"season" integer,
	"player_count" integer,
	"top_cut" integer,
	"coverage" integer,
	"source_url" text DEFAULT '' NOT NULL,
	"source_name" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_favorites" (
	"player_id" text NOT NULL,
	"favorite_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"password_hash" text,
	"role" text DEFAULT 'player' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"color" text DEFAULT '#f0b429' NOT NULL,
	"avatar_kind" text DEFAULT 'none' NOT NULL,
	"avatar_value" text DEFAULT '' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"favorite_archetype_id" text,
	"player_tag" text,
	"ladder_elo" integer,
	"ladder_elo_updated_at" timestamp with time zone,
	"ladder_note" text DEFAULT '' NOT NULL,
	"rank_spain" integer,
	"rank_europe" integer,
	"rank_zone_updated_at" timestamp with time zone,
	"joined" date NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "season_resets" (
	"id" text PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"name" text DEFAULT 'Liga Arena' NOT NULL,
	"season" text DEFAULT 'Temporada 1' NOT NULL,
	"cp_season" integer DEFAULT 2027 NOT NULL,
	"pts_win" integer DEFAULT 3 NOT NULL,
	"pts_tie" integer DEFAULT 1 NOT NULL,
	"pts_loss" integer DEFAULT 0 NOT NULL,
	"elo_start" integer DEFAULT 1000 NOT NULL,
	"elo_k" integer DEFAULT 24 NOT NULL,
	"elo_scope" text DEFAULT 'competitive' NOT NULL,
	"elo_since" date,
	"ladder_since" timestamp with time zone,
	"rating_zone" text DEFAULT 'europe' NOT NULL,
	"registration_open" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_results" (
	"id" text PRIMARY KEY NOT NULL,
	"tournament_id" text NOT NULL,
	"player_id" text NOT NULL,
	"placement" integer,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"ties" integer DEFAULT 0 NOT NULL,
	"deck_id" text,
	"archetype_id" text,
	"cp_earned" integer DEFAULT 0 NOT NULL,
	"cp_manual" boolean DEFAULT false NOT NULL,
	"prizes" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"dropped" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'store' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"closed_at" timestamp with time zone,
	"scope" text DEFAULT 'onsite' NOT NULL,
	"format" text DEFAULT 'standard' NOT NULL,
	"best_of" integer DEFAULT 3 NOT NULL,
	"date" date NOT NULL,
	"end_date" date,
	"start_time" text,
	"entry_fee_cents" integer,
	"venue" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"country" text DEFAULT '' NOT NULL,
	"organizer" text DEFAULT '' NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"player_count" integer,
	"rounds" integer,
	"top_cut" integer,
	"season" integer,
	"division" text DEFAULT 'masters' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "archetypes" ADD CONSTRAINT "archetypes_parent_id_archetypes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."archetypes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_players" ADD CONSTRAINT "competition_players_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_players" ADD CONSTRAINT "competition_players_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_teams" ADD CONSTRAINT "competition_teams_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_favorites" ADD CONSTRAINT "deck_favorites_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_favorites" ADD CONSTRAINT "deck_favorites_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_archetype_id_archetypes_id_fk" FOREIGN KEY ("archetype_id") REFERENCES "public"."archetypes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_created_by_players_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_created_by_players_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ladder_entries" ADD CONSTRAINT "ladder_entries_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ladder_entries" ADD CONSTRAINT "ladder_entries_created_by_players_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_decks" ADD CONSTRAINT "league_decks_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_decks" ADD CONSTRAINT "league_decks_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_decks" ADD CONSTRAINT "league_decks_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_decks" ADD CONSTRAINT "league_decks_archetype_id_archetypes_id_fk" FOREIGN KEY ("archetype_id") REFERENCES "public"."archetypes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_decks" ADD CONSTRAINT "league_decks_created_by_players_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_player_a_id_players_id_fk" FOREIGN KEY ("player_a_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_player_b_id_players_id_fk" FOREIGN KEY ("player_b_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_opponent_player_id_players_id_fk" FOREIGN KEY ("opponent_player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_deck_a_id_decks_id_fk" FOREIGN KEY ("deck_a_id") REFERENCES "public"."decks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_deck_b_id_decks_id_fk" FOREIGN KEY ("deck_b_id") REFERENCES "public"."decks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_archetype_a_id_archetypes_id_fk" FOREIGN KEY ("archetype_a_id") REFERENCES "public"."archetypes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_opponent_archetype_id_archetypes_id_fk" FOREIGN KEY ("opponent_archetype_id") REFERENCES "public"."archetypes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_created_by_players_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_entries" ADD CONSTRAINT "meta_entries_event_id_meta_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."meta_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_entries" ADD CONSTRAINT "meta_entries_archetype_id_archetypes_id_fk" FOREIGN KEY ("archetype_id") REFERENCES "public"."archetypes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_events" ADD CONSTRAINT "meta_events_created_by_players_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_favorites" ADD CONSTRAINT "player_favorites_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_favorites" ADD CONSTRAINT "player_favorites_favorite_id_players_id_fk" FOREIGN KEY ("favorite_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_resets" ADD CONSTRAINT "season_resets_created_by_players_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_results" ADD CONSTRAINT "tournament_results_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_results" ADD CONSTRAINT "tournament_results_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_results" ADD CONSTRAINT "tournament_results_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_results" ADD CONSTRAINT "tournament_results_archetype_id_archetypes_id_fk" FOREIGN KEY ("archetype_id") REFERENCES "public"."archetypes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_created_by_players_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cp_comp_idx" ON "competition_players" USING btree ("competition_id");--> statement-breakpoint
CREATE INDEX "competition_teams_comp_idx" ON "competition_teams" USING btree ("competition_id");--> statement-breakpoint
CREATE UNIQUE INDEX "deck_fav_unique_idx" ON "deck_favorites" USING btree ("player_id","deck_id");--> statement-breakpoint
CREATE INDEX "deck_fav_player_idx" ON "deck_favorites" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "decks_player_idx" ON "decks" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "games_match_idx" ON "games" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "ladder_player_idx" ON "ladder_entries" USING btree ("player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "league_decks_slot_idx" ON "league_decks" USING btree ("competition_id","player_id","slot");--> statement-breakpoint
CREATE INDEX "matches_comp_idx" ON "matches" USING btree ("competition_id");--> statement-breakpoint
CREATE INDEX "matches_tour_idx" ON "matches" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "matches_a_idx" ON "matches" USING btree ("player_a_id");--> statement-breakpoint
CREATE INDEX "matches_opp_player_idx" ON "matches" USING btree ("opponent_player_id");--> statement-breakpoint
CREATE INDEX "matches_b_idx" ON "matches" USING btree ("player_b_id");--> statement-breakpoint
CREATE INDEX "matches_date_idx" ON "matches" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "matches_tour_round_idx" ON "matches" USING btree ("tournament_id","player_a_id","round") WHERE "matches"."tournament_id" is not null;--> statement-breakpoint
CREATE INDEX "meta_entries_event_idx" ON "meta_entries" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "meta_entries_place_idx" ON "meta_entries" USING btree ("event_id","placement") WHERE "meta_entries"."placement" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "meta_events_ident_idx" ON "meta_events" USING btree ("name","date","division");--> statement-breakpoint
CREATE INDEX "meta_events_date_idx" ON "meta_events" USING btree ("date");--> statement-breakpoint
CREATE INDEX "meta_events_kind_idx" ON "meta_events" USING btree ("kind");--> statement-breakpoint
CREATE UNIQUE INDEX "player_fav_unique_idx" ON "player_favorites" USING btree ("player_id","favorite_id");--> statement-breakpoint
CREATE INDEX "player_fav_player_idx" ON "player_favorites" USING btree ("player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "players_email_idx" ON "players" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "tr_unique_idx" ON "tournament_results" USING btree ("tournament_id","player_id");--> statement-breakpoint
CREATE INDEX "tr_player_idx" ON "tournament_results" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "tournaments_date_idx" ON "tournaments" USING btree ("date");--> statement-breakpoint
CREATE INDEX "tournaments_kind_idx" ON "tournaments" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "tournaments_season_idx" ON "tournaments" USING btree ("season");