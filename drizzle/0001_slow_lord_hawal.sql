ALTER TABLE "decks" ADD COLUMN "live_wins" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "decks" ADD COLUMN "live_losses" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "archetype_a_id" text;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "archetype_b_id" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "login_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "locked_until" timestamp;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "session_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "featured_regional_id" text;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_archetype_a_id_archetypes_id_fk" FOREIGN KEY ("archetype_a_id") REFERENCES "public"."archetypes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_archetype_b_id_archetypes_id_fk" FOREIGN KEY ("archetype_b_id") REFERENCES "public"."archetypes"("id") ON DELETE set null ON UPDATE no action;