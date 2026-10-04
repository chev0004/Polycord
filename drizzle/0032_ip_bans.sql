ALTER TYPE "public"."moderation_action" ADD VALUE 'ip_block';--> statement-breakpoint
ALTER TYPE "public"."moderation_action" ADD VALUE 'ip_unblock';--> statement-breakpoint
CREATE TABLE "ip_bans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip" varchar(45) NOT NULL,
	"target_discord_user_id" varchar(32),
	"reason" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_by" uuid,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "ip_bans_reason_length_check" CHECK ("ip_bans"."reason" is null or char_length("ip_bans"."reason") <= 500)
);
--> statement-breakpoint
CREATE TABLE "ip_observations" (
	"discord_user_id" varchar(32) NOT NULL,
	"ip" varchar(45) NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ip_observations_discord_user_id_ip_pk" PRIMARY KEY("discord_user_id","ip")
);
--> statement-breakpoint
ALTER TABLE "ip_bans" ADD CONSTRAINT "ip_bans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ip_bans" ADD CONSTRAINT "ip_bans_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ip_bans_active_ip_idx" ON "ip_bans" USING btree ("ip") WHERE "ip_bans"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "ip_observations_last_seen_at_idx" ON "ip_observations" USING btree ("last_seen_at");