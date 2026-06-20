ALTER TABLE "profiles" ADD COLUMN "last_bumped_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "profiles_last_bumped_at_idx" ON "profiles" USING btree ("last_bumped_at");