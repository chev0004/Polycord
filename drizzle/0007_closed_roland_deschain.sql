CREATE TYPE "public"."theme" AS ENUM('dark', 'light');--> statement-breakpoint
CREATE TYPE "public"."time_format" AS ENUM('12hr', '24hr');--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"theme" "theme" DEFAULT 'dark' NOT NULL,
	"application_language" varchar(16) DEFAULT 'en' NOT NULL,
	"time_format" time_format DEFAULT '24hr' NOT NULL,
	"activity_status" boolean DEFAULT true NOT NULL,
	"push_notifications" boolean DEFAULT true NOT NULL,
	"match_alert" boolean DEFAULT true NOT NULL,
	"profile_interaction_alert" boolean DEFAULT true NOT NULL,
	"profile_view_alert" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_settings_user_id_idx" ON "user_settings" USING btree ("user_id");