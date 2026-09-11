CREATE TABLE "profile_boosts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"used_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "boosted_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profile_boosts" ADD CONSTRAINT "profile_boosts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profile_boosts_user_id_used_at_idx" ON "profile_boosts" USING btree ("user_id","used_at");