CREATE TYPE "public"."report_reason" AS ENUM('spam', 'harassment', 'inappropriate', 'impersonation', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('pending', 'reviewed', 'dismissed');--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_user_id" uuid NOT NULL,
	"reported_user_id" uuid NOT NULL,
	"reported_profile_id" uuid,
	"reason" "report_reason" NOT NULL,
	"details" text,
	"status" "report_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_details_length_check" CHECK ("reports"."details" is null or char_length("reports"."details") <= 1000),
	CONSTRAINT "reports_no_self_report_check" CHECK ("reports"."reporter_user_id" <> "reports"."reported_user_id")
);
--> statement-breakpoint
CREATE TABLE "user_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_user_id" uuid NOT NULL,
	"blocked_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_blocks_no_self_block_check" CHECK ("user_blocks"."blocker_user_id" <> "user_blocks"."blocked_user_id")
);
--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_user_id_users_id_fk" FOREIGN KEY ("reported_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_profile_id_profiles_id_fk" FOREIGN KEY ("reported_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_user_id_users_id_fk" FOREIGN KEY ("blocker_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_user_id_users_id_fk" FOREIGN KEY ("blocked_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reports_reported_user_id_idx" ON "reports" USING btree ("reported_user_id");--> statement-breakpoint
CREATE INDEX "reports_reporter_user_id_idx" ON "reports" USING btree ("reporter_user_id");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "user_blocks_blocker_blocked_idx" ON "user_blocks" USING btree ("blocker_user_id","blocked_user_id");--> statement-breakpoint
CREATE INDEX "user_blocks_blocker_user_id_idx" ON "user_blocks" USING btree ("blocker_user_id");--> statement-breakpoint
CREATE INDEX "user_blocks_blocked_user_id_idx" ON "user_blocks" USING btree ("blocked_user_id");