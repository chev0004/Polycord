CREATE TYPE "public"."grant_unit" AS ENUM('weeks', 'months', 'years');--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD COLUMN "grant_amount" integer;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD COLUMN "grant_unit" "grant_unit";