CREATE TYPE "public"."sponsor_tier" AS ENUM('card', 'banner');--> statement-breakpoint
CREATE TABLE "sponsors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tier" "sponsor_tier" NOT NULL,
	"name" varchar(80) NOT NULL,
	"url" text NOT NULL,
	"alt_en" varchar(200) NOT NULL,
	"alt_ja" varchar(200) NOT NULL,
	"image" text NOT NULL,
	"image_type" varchar(32) NOT NULL,
	"phone_image" text,
	"phone_image_type" varchar(32),
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"paused" boolean DEFAULT false NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sponsors_schedule_check" CHECK ("sponsors"."ends_at" > "sponsors"."starts_at")
);
--> statement-breakpoint
ALTER TABLE "sponsors" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "sponsors_tier_ends_at_idx" ON "sponsors" USING btree ("tier","ends_at");
