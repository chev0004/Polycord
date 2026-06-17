CREATE TABLE "profile_target_languages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"language" varchar(16) NOT NULL,
	"proficiency_level" "proficiency_level" NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "profile_target_languages_position_check" CHECK ("profile_target_languages"."position" >= 0)
);
--> statement-breakpoint
ALTER TABLE "profile_target_languages" ADD CONSTRAINT "profile_target_languages_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "profile_target_languages" ("profile_id", "language", "proficiency_level", "position")
SELECT "id", "target_language", "proficiency_level", 0
FROM "profiles"
ON CONFLICT DO NOTHING;--> statement-breakpoint
CREATE INDEX "profile_target_languages_profile_id_idx" ON "profile_target_languages" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "profile_target_languages_language_idx" ON "profile_target_languages" USING btree ("language");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_target_languages_profile_language_idx" ON "profile_target_languages" USING btree ("profile_id","language");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_target_languages_profile_position_idx" ON "profile_target_languages" USING btree ("profile_id","position");
--> statement-breakpoint
ALTER TABLE "profile_target_languages" ENABLE ROW LEVEL SECURITY;
