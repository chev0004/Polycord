ALTER TABLE "notifications" ADD COLUMN "warning_category" varchar(32);--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "acknowledged_at" timestamp with time zone;