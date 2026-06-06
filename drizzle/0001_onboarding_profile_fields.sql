ALTER TABLE "profiles" ADD COLUMN "availability" varchar(32) DEFAULT 'flexible' NOT NULL;--> statement-breakpoint
UPDATE "profiles"
SET "availability" = CASE trim(split_part("bio", E'\nAvailability:', 2))
	WHEN 'Weeknights' THEN 'weeknights'
	WHEN 'Weekends' THEN 'weekends'
	WHEN 'Weekday mornings' THEN 'weekday_mornings'
	WHEN 'Flexible' THEN 'flexible'
	ELSE "availability"
END
WHERE "bio" LIKE 'Goals:%' AND "bio" LIKE '%' || E'\nAvailability:%';--> statement-breakpoint
UPDATE "profiles"
SET "bio" = trim(split_part(split_part("bio", E'\nAvailability:', 1), 'Goals:', 2))
WHERE "bio" LIKE 'Goals:%'
	AND "bio" LIKE '%' || E'\nAvailability:%'
	AND char_length(trim(split_part(split_part("bio", E'\nAvailability:', 1), 'Goals:', 2))) BETWEEN 10 AND 500;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_availability_check" CHECK ("profiles"."availability" in ('weeknights', 'weekends', 'weekday_mornings', 'flexible'));
