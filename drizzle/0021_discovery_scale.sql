CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE OR REPLACE FUNCTION discovery_profile_text(bio text, country varchar, tags text[], display_timezone boolean, timezone varchar)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$ SELECT lower(concat_ws(' ', bio, country, array_to_string(tags, ' '), CASE WHEN display_timezone THEN timezone END)) $$;--> statement-breakpoint
DROP INDEX "profiles_last_bumped_at_idx";--> statement-breakpoint
CREATE INDEX "profiles_timezone_idx" ON "profiles" USING btree ("timezone");--> statement-breakpoint
CREATE INDEX "profiles_boosted_until_idx" ON "profiles" USING btree ("boosted_until") WHERE "profiles"."boosted_until" is not null;--> statement-breakpoint
CREATE INDEX "profiles_tags_idx" ON "profiles" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "profiles_search_idx" ON "profiles" USING gin (discovery_profile_text("bio", "country", "tags", "display_timezone", "timezone") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "users_display_name_idx" ON "users" USING btree ("display_name");--> statement-breakpoint
CREATE INDEX "users_display_name_trgm_idx" ON "users" USING gin (lower("display_name") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "users_discord_username_trgm_idx" ON "users" USING gin (lower("discord_username") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "profiles_last_bumped_at_idx" ON "profiles" USING btree ("last_bumped_at" DESC NULLS LAST);