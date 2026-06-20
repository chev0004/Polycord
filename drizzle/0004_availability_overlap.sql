ALTER TABLE "profiles" ADD COLUMN "display_availability" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "availability_days" varchar(16);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "availability_from" varchar(5);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "availability_to" varchar(5);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "availability_any_time" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_availability_days_check" CHECK ("profiles"."availability_days" is null or "profiles"."availability_days" in ('any', 'weekdays', 'weekends'));--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_availability_from_check" CHECK ("profiles"."availability_from" is null or "profiles"."availability_from" ~ '^[0-2][0-9]:[0-5][0-9]$');--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_availability_to_check" CHECK ("profiles"."availability_to" is null or "profiles"."availability_to" ~ '^[0-2][0-9]:[0-5][0-9]$');