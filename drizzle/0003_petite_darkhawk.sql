CREATE TABLE "saved_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saved_profiles" ADD CONSTRAINT "saved_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_profiles" ADD CONSTRAINT "saved_profiles_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "saved_profiles_user_profile_idx" ON "saved_profiles" USING btree ("user_id","profile_id");--> statement-breakpoint
CREATE INDEX "saved_profiles_user_id_idx" ON "saved_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "saved_profiles_profile_id_idx" ON "saved_profiles" USING btree ("profile_id");