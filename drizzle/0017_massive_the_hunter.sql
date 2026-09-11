CREATE TYPE "public"."language_display" AS ENUM('long', 'short');--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "language_display" "language_display" DEFAULT 'long' NOT NULL;