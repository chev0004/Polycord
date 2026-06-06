CREATE TYPE "public"."proficiency_level" AS ENUM('beginner', 'intermediate', 'advanced', 'native-level');--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"allow_anonymous_copy" boolean DEFAULT true NOT NULL,
	"display_timezone" boolean DEFAULT true NOT NULL,
	"primary_language" varchar(16) NOT NULL,
	"target_language" varchar(16) NOT NULL,
	"proficiency_level" "proficiency_level" NOT NULL,
	"bio" text NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"country" varchar(2),
	"timezone" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_bio_length_check" CHECK (char_length("profiles"."bio") between 10 and 500),
	CONSTRAINT "profiles_tags_limit_check" CHECK (cardinality("profiles"."tags") <= 6)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discord_user_id" varchar(32) NOT NULL,
	"discord_username" varchar(64) NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_user_id_idx" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "profiles_public_idx" ON "profiles" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "profiles_primary_language_idx" ON "profiles" USING btree ("primary_language");--> statement-breakpoint
CREATE INDEX "profiles_target_language_idx" ON "profiles" USING btree ("target_language");--> statement-breakpoint
CREATE INDEX "profiles_country_idx" ON "profiles" USING btree ("country");--> statement-breakpoint
CREATE UNIQUE INDEX "users_discord_user_id_idx" ON "users" USING btree ("discord_user_id");--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
	NEW.updated_at = now();
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON "users"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON "profiles"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
